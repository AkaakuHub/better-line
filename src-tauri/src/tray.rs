use anyhow::Result;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

pub(crate) fn setup_tray(app: &tauri::AppHandle) -> Result<()> {
  let mut builder = TrayIconBuilder::new();
  if let Some(icon) = app.default_window_icon() {
    builder = builder.icon(icon.clone());
  }

  let _tray = builder
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
        let app_handle = tray.app_handle();
        if let Some(window) = app_handle.get_webview_window("main") {
          let _ = window.unminimize();
          let _ = window.show();
          let _ = window.set_focus();
        }
      }
    })
    .build(app)?;

  Ok(())
}
