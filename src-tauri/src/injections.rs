const FONT_SCRIPT: &str = include_str!("../injections/font.js");
const SIDEBAR_SCRIPT: &str = include_str!("../injections/sidebar.js");

pub(crate) fn inject_scripts(window: &tauri::WebviewWindow) -> Result<(), tauri::Error> {
  window.eval(FONT_SCRIPT)?;
  window.eval(SIDEBAR_SCRIPT)?;
  Ok(())
}
