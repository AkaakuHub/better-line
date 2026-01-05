const FONT_SCRIPT: &str = include_str!("../injections/font.js");
const SIDEBAR_SCRIPT: &str = include_str!("../injections/sidebar.js");
const HOTKEYS_SCRIPT: &str = include_str!("../injections/hotkeys.js");
const SETTINGS_SCRIPT: &str = include_str!("../injections/settings.js");

pub(crate) fn inject_scripts<R: tauri::Runtime>(
  webview: &tauri::Webview<R>,
) -> Result<(), tauri::Error> {
  webview.eval(FONT_SCRIPT)?;
  webview.eval(SIDEBAR_SCRIPT)?;
  Ok(())
}

pub(crate) fn inject_hotkeys<R: tauri::Runtime>(
  webview: &tauri::Webview<R>,
) -> Result<(), tauri::Error> {
  webview.eval(HOTKEYS_SCRIPT)?;
  Ok(())
}

pub(crate) fn inject_settings<R: tauri::Runtime>(
  webview: &tauri::Webview<R>,
) -> Result<(), tauri::Error> {
  webview.eval(SETTINGS_SCRIPT)?;
  Ok(())
}
