use crate::content_protection::{is_content_protected, set_content_protection_from_app};
use crate::settings::{load_settings, save_settings};
use tauri::menu::{CheckMenuItem, Menu, MenuEvent, MenuId, PredefinedMenuItem, Submenu};
use tauri::{Manager, Wry};
use tauri_plugin_autostart::ManagerExt;

const MENU_CONTENT_PROTECTION_ID: &str = "menu.content_protection";
const MENU_AUTOSTART_ID: &str = "menu.autostart";
const MENU_START_MINIMIZED_ID: &str = "menu.start_minimized";

pub(crate) struct MenuState {
  pub(crate) menu: Menu<Wry>,
  content_protection: CheckMenuItem<Wry>,
  autostart: CheckMenuItem<Wry>,
  start_minimized: CheckMenuItem<Wry>,
}

pub(crate) fn build_menu(
  app_handle: &tauri::AppHandle,
  settings: &crate::settings::AppSettings,
) -> tauri::Result<MenuState> {
  let autostart_enabled = app_handle
    .autolaunch()
    .is_enabled()
    .unwrap_or(settings.auto_start);

  let content_protection = CheckMenuItem::with_id(
    app_handle,
    MenuId::new(MENU_CONTENT_PROTECTION_ID),
    "画面を保護 (Alt+H)",
    true,
    settings.content_protection,
    Some("Alt+H"),
  )?;
  let autostart = CheckMenuItem::with_id(
    app_handle,
    MenuId::new(MENU_AUTOSTART_ID),
    "Windows 起動時に自動起動",
    true,
    autostart_enabled,
    None::<&str>,
  )?;
  let start_minimized = CheckMenuItem::with_id(
    app_handle,
    MenuId::new(MENU_START_MINIMIZED_ID),
    "起動時に最小化",
    true,
    settings.start_minimized,
    None::<&str>,
  )?;

  let settings_menu = Submenu::with_items(
    app_handle,
    "設定",
    true,
    &[
      &content_protection,
      &autostart,
      &start_minimized,
      &PredefinedMenuItem::separator(app_handle)?,
      &PredefinedMenuItem::close_window(app_handle, None)?,
    ],
  )?;

  let menu = Menu::with_items(app_handle, &[&settings_menu])?;
  Ok(MenuState {
    menu,
    content_protection,
    autostart,
    start_minimized,
  })
}

pub(crate) fn handle_menu_event(app_handle: &tauri::AppHandle, event: MenuEvent) {
  match event.id() {
    id if id == MENU_CONTENT_PROTECTION_ID => {
      let target = !is_content_protected(app_handle);
      if let Ok(enabled) = set_content_protection_from_app(app_handle, target) {
        set_menu_checked(app_handle, MENU_CONTENT_PROTECTION_ID, enabled);
      }
    }
    id if id == MENU_AUTOSTART_ID => {
      let autolaunch = app_handle.autolaunch();
      let fallback_enabled = load_settings(app_handle)
        .map(|settings| settings.auto_start)
        .unwrap_or(false);
      let current = autolaunch.is_enabled().unwrap_or(fallback_enabled);
      let target = !current;
      let result = if target {
        autolaunch.enable()
      } else {
        autolaunch.disable()
      };
      if result.is_err() {
        let enabled = autolaunch.is_enabled().unwrap_or(false);
        set_menu_checked(app_handle, MENU_AUTOSTART_ID, enabled);
        return;
      }
      if let Ok(mut settings) = load_settings(app_handle) {
        settings.auto_start = target;
        let _ = save_settings(app_handle, &settings);
      }
      let enabled = autolaunch.is_enabled().unwrap_or(target);
      set_menu_checked(app_handle, MENU_AUTOSTART_ID, enabled);
    }
    id if id == MENU_START_MINIMIZED_ID => {
      let current = load_settings(app_handle)
        .map(|settings| settings.start_minimized)
        .unwrap_or(false);
      let target = !current;
      if let Ok(mut settings) = load_settings(app_handle) {
        settings.start_minimized = target;
        let _ = save_settings(app_handle, &settings);
      }
      set_menu_checked(app_handle, MENU_START_MINIMIZED_ID, target);
    }
    _ => {}
  }
}

pub(crate) fn set_menu_checked(app_handle: &tauri::AppHandle, id: &str, checked: bool) {
  let Some(state) = app_handle.try_state::<MenuState>() else {
    return;
  };
  match id {
    MENU_CONTENT_PROTECTION_ID => {
      let _ = state.content_protection.set_checked(checked);
    }
    MENU_AUTOSTART_ID => {
      let _ = state.autostart.set_checked(checked);
    }
    MENU_START_MINIMIZED_ID => {
      let _ = state.start_minimized.set_checked(checked);
    }
    _ => {}
  }
}

pub(crate) fn menu_content_protection_id() -> &'static str {
  MENU_CONTENT_PROTECTION_ID
}
