mod config;
mod crx;
mod extensions;
mod injections;
mod windowing;

use config::load_config;
#[cfg(target_os = "windows")]
use extensions::install_extensions_and_open;
use extensions::prepare_extensions;
use injections::inject_scripts;
use tauri::webview::PageLoadEvent;
use tauri::{WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;
#[cfg(target_os = "windows")]
use windowing::attach_new_window_handler;
use windowing::{next_popup_label, should_open_external};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      let app_handle = app.handle().clone();
      let (line_dir, user_dir) = match prepare_extensions(&app_handle) {
        Ok(result) => result,
        Err(error) => {
          eprintln!("[update] failed: {error:#}");
          return Err(Box::<dyn std::error::Error>::from(error));
        }
      };

      let config = load_config(&app_handle)?;

      WebviewWindowBuilder::new(&app_handle, "main", WebviewUrl::App("index.html".into()))
        .title("better-line")
        .inner_size(1280.0, 800.0)
        .browser_extensions_enabled(true)
        .on_new_window({
          let app_handle = app_handle.clone();
          move |url, features| {
            if should_open_external(&url) {
              let _ = app_handle.opener().open_url(url.as_str(), None::<&str>);
              return tauri::webview::NewWindowResponse::Deny;
            }

            let label = next_popup_label();
            let builder =
              WebviewWindowBuilder::new(&app_handle, label, WebviewUrl::External(url.clone()))
                .browser_extensions_enabled(true)
                .window_features(features)
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
                .on_page_load(|window, payload| {
                  if payload.event() == PageLoadEvent::Finished {
                    let current_url = payload.url().as_str();
                    if current_url.starts_with("chrome-extension://") {
                      let _ = inject_scripts(&window);
                    }
                  }
                })
                .title(url.as_str());

            let window = match builder.build() {
              Ok(window) => window,
              Err(error) => {
                eprintln!("[new-window] failed: {error:#}");
                return tauri::webview::NewWindowResponse::Deny;
              }
            };

            #[cfg(target_os = "windows")]
            if let Err(error) = window.with_webview({
              let app_handle = app_handle.clone();
              move |webview| {
                if let Err(error) = attach_new_window_handler(app_handle, &webview) {
                  eprintln!("[new-window] handler failed: {error:#}");
                }
              }
            }) {
              eprintln!("[new-window] with_webview failed: {error:#}");
            }

            tauri::webview::NewWindowResponse::Create { window }
          }
        })
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
        .on_page_load({
          move |window, payload| {
            if payload.event() == PageLoadEvent::Finished {
              let current_url = payload.url().as_str();
              if current_url.starts_with("chrome-extension://") {
                let _ = inject_scripts(&window);
              }
            }
          }
        })
        .build()?
        .with_webview(move |webview| {
          let result = install_extensions_and_open(
            app_handle.clone(),
            webview,
            line_dir,
            user_dir,
            config.line_entry_path,
          );

          if let Err(error) = result {
            eprintln!("[open] failed: {error:#}");
            panic!("failed to open LINE extension");
          }
        })?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
