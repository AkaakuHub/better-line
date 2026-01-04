mod config;
mod crx;
mod extensions;
mod injections;
mod windowing;

use config::load_config;
#[cfg(target_os = "windows")]
use extensions::install_extensions_and_open;
use extensions::prepare_extensions;
use injections::{inject_hotkeys, inject_scripts};
use std::collections::HashMap;
use std::sync::{
  atomic::{AtomicBool, Ordering},
  Mutex,
};
use tauri::webview::PageLoadEvent;
use tauri::{Manager, Runtime, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;
#[cfg(target_os = "windows")]
use windowing::{
  attach_close_requested_handler, attach_new_window_handler, attach_permission_handler,
};
use windowing::{next_popup_label, should_open_external};

const HIDDEN_TITLE_SUFFIX: &str = " - hidden window";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .on_page_load(|webview, payload| {
      if payload.event() != PageLoadEvent::Finished {
        return;
      }
      let _ = inject_hotkeys(webview);
      let current_url = payload.url().as_str();
      if current_url.starts_with("chrome-extension://") {
        let _ = inject_scripts(webview);
      }

      let window = webview.window();
      let app_handle = window.app_handle().clone();
      let label = window.label().to_string();
      let protected = app_handle
        .state::<WindowState>()
        .protected
        .load(Ordering::Relaxed);
      if let Some(webview_window) = app_handle.get_webview_window(&label) {
        let base_title = ensure_base_title(&app_handle, &webview_window, &label);
        set_content_protected(
          &webview_window,
          &label,
          protected,
          Some(base_title.as_str()),
        );
      }
    })
    .invoke_handler(tauri::generate_handler![toggle_content_protection])
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      let app_handle = app.handle().clone();
      app.manage(WindowState::new());
      let config = load_config(&app_handle)?;

      let base_title = "refined-line";
      let _window =
        WebviewWindowBuilder::new(&app_handle, "main", WebviewUrl::App("index.html".into()))
          .title(base_title)
          .inner_size(1280.0, 800.0)
          .browser_extensions_enabled(true)
          .on_navigation({
            let app_handle = app_handle.clone();
            move |url| {
              if should_open_external(url) {
                let _ = app_handle.opener().open_url(url.as_str(), None::<&str>);
                return false;
              }
              true
            }
          })
          .on_new_window({
            let app_handle = app_handle.clone();
            move |url, features| {
              if should_open_external(&url) {
                let _ = app_handle.opener().open_url(url.as_str(), None::<&str>);
                return tauri::webview::NewWindowResponse::Deny;
              }

              let label = next_popup_label();
              let popup_label = label.clone();
              let popup_base_title = url.as_str().to_string();
              store_base_title(&app_handle, popup_label.as_str(), &popup_base_title);

              let mut builder =
                WebviewWindowBuilder::new(&app_handle, label, WebviewUrl::External(url.clone()))
                  .title(popup_base_title.as_str())
                  .browser_extensions_enabled(true)
                  .on_navigation({
                    let app_handle = app_handle.clone();
                    move |url| {
                      if should_open_external(url) {
                        let _ = app_handle.opener().open_url(url.as_str(), None::<&str>);
                        return false;
                      }
                      true
                    }
                  });

              if let Some(size) = features.size() {
                builder = builder.inner_size(size.width, size.height);
              }

              #[cfg(windows)]
              {
                builder = builder.with_environment(features.opener().environment.clone());
              }

              let window = match builder.build() {
                Ok(window) => window,
                Err(error) => {
                  eprintln!("[new-window] failed: {error:#}");
                  return tauri::webview::NewWindowResponse::Deny;
                }
              };

              let protected = app_handle
                .state::<WindowState>()
                .protected
                .load(Ordering::Relaxed);
              let window_for_tasks = window.clone();
              let app_handle_for_tasks = app_handle.clone();
              let popup_label_for_tasks = popup_label.clone();
              let popup_title_for_tasks = popup_base_title.clone();
              let _ = window.run_on_main_thread(move || {
                set_content_protected(
                  &window_for_tasks,
                  &popup_label_for_tasks,
                  protected,
                  Some(popup_title_for_tasks.as_str()),
                );

                #[cfg(target_os = "windows")]
                if let Err(error) = window_for_tasks.with_webview({
                  let app_handle = app_handle_for_tasks.clone();
                  let popup_label = popup_label_for_tasks.clone();
                  move |webview| {
                    if let Err(error) = attach_new_window_handler(app_handle.clone(), &webview) {
                      eprintln!("[new-window] handler failed: {error:#}");
                    }
                    if let Err(error) = attach_permission_handler(&webview) {
                      eprintln!("[new-window] permission handler failed: {error:#}");
                    }
                    if let Err(error) = attach_close_requested_handler(
                      app_handle.clone(),
                      &webview,
                      popup_label.clone(),
                    ) {
                      eprintln!("[new-window] close handler failed: {error:#}");
                    }
                  }
                }) {
                  eprintln!("[new-window] with_webview failed: {error:#}");
                }
              });

              tauri::webview::NewWindowResponse::Create { window }
            }
          })
          .build()?;

      store_base_title(&app_handle, "main", base_title);

      let entry_path = config.line_entry_path.clone();
      let app_handle_for_update = app_handle.clone();
      std::thread::spawn(move || {
        let (line_dir, user_dir) = match prepare_extensions(&app_handle_for_update) {
          Ok(result) => result,
          Err(error) => {
            eprintln!("[update] failed: {error:#}");
            return;
          }
        };

        let app_handle_for_install = app_handle_for_update.clone();
        let entry_path_for_install = entry_path.clone();
        let handle_for_task = app_handle_for_install.clone();
        let _ = app_handle_for_install.run_on_main_thread(move || {
          let Some(window) = handle_for_task.get_webview_window("main") else {
            eprintln!("[open] main window not found");
            return;
          };
          if let Err(error) = window.with_webview(move |webview| {
            let result = install_extensions_and_open(
              handle_for_task.clone(),
              webview,
              line_dir,
              user_dir,
              entry_path_for_install,
            );
            if let Err(error) = result {
              eprintln!("[open] failed: {error:#}");
              panic!("failed to open LINE extension");
            }
          }) {
            eprintln!("[open] with_webview failed: {error:#}");
          }
        });
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

struct WindowState {
  protected: AtomicBool,
  titles: Mutex<HashMap<String, String>>,
}

impl WindowState {
  fn new() -> Self {
    Self {
      protected: AtomicBool::new(true),
      titles: Mutex::new(HashMap::new()),
    }
  }
}

fn apply_content_protection<R: Runtime>(
  app_handle: &tauri::AppHandle<R>,
  protected: bool,
) -> usize {
  let mut count = 0usize;
  for (label, window) in app_handle.webview_windows() {
    count += 1;
    let base_title = get_base_title(app_handle, &label);
    set_content_protected(&window, &label, protected, base_title.as_deref());
  }
  count
}

#[tauri::command]
fn toggle_content_protection(
  app_handle: tauri::AppHandle,
  state: State<WindowState>,
) -> Result<bool, String> {
  let enabled = !state.protected.load(Ordering::Relaxed);
  state.protected.store(enabled, Ordering::Relaxed);
  let count = apply_content_protection(&app_handle, enabled);
  println!("[content-protected] toggled {enabled} windows={count}");
  Ok(enabled)
}

fn set_content_protected<R: Runtime>(
  window: &tauri::WebviewWindow<R>,
  label: &str,
  protected: bool,
  base_title: Option<&str>,
) {
  if let Err(error) = window.set_content_protected(protected) {
    eprintln!("[content-protected] {label} failed: {error:#}");
  } else {
    if let Some(base_title) = base_title {
      update_window_title(window, base_title, protected);
    }
    println!("[content-protected] {label} set {protected}");
  }
}

fn update_window_title<R: Runtime>(
  window: &tauri::WebviewWindow<R>,
  base_title: &str,
  protected: bool,
) {
  let next = if protected {
    format!("{base_title}{HIDDEN_TITLE_SUFFIX}")
  } else {
    base_title.to_string()
  };
  let _ = window.set_title(&next);
}

fn store_base_title<R: Runtime>(app_handle: &tauri::AppHandle<R>, label: &str, base_title: &str) {
  if let Ok(mut titles) = app_handle.state::<WindowState>().titles.lock() {
    titles.insert(label.to_string(), base_title.to_string());
  }
}

fn get_base_title<R: Runtime>(app_handle: &tauri::AppHandle<R>, label: &str) -> Option<String> {
  app_handle
    .state::<WindowState>()
    .titles
    .lock()
    .ok()
    .and_then(|titles| titles.get(label).cloned())
}

fn ensure_base_title<R: Runtime>(
  app_handle: &tauri::AppHandle<R>,
  window: &tauri::WebviewWindow<R>,
  label: &str,
) -> String {
  if let Some(existing) = get_base_title(app_handle, label) {
    return existing;
  }
  let title = window.title().unwrap_or_else(|_| label.to_string());
  store_base_title(app_handle, label, &title);
  title
}
