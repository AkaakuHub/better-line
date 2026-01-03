use anyhow::{anyhow, Result};
use std::fs;
use tauri::path::BaseDirectory;
use tauri::Manager;

#[derive(serde::Deserialize)]
pub(crate) struct AppConfig {
  #[serde(rename = "lineExtensionId")]
  pub(crate) line_extension_id: String,
  #[serde(rename = "lineEntryPath")]
  pub(crate) line_entry_path: String,
  #[serde(rename = "update2BaseUrl")]
  pub(crate) update2_base_url: String,
}

pub(crate) fn load_config(app: &tauri::AppHandle) -> Result<AppConfig> {
  let config_path = app
    .path()
    .resolve("config.json", BaseDirectory::Resource)
    .map_err(|error| anyhow!("config path error: {error}"))?;
  let raw = fs::read_to_string(&config_path)?;
  let config: AppConfig = serde_json::from_str(&raw)?;
  Ok(config)
}
