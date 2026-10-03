//! Tauri コマンド。`Layout` を組み立てて `service` / `inspect` を呼ぶだけの薄い層。
use tauri::Manager;
use tauri_specta::Event;

use crate::agent::{Agent, Kind};
use crate::error::SymlinkError;
use crate::layout::Layout;
use crate::model::{HookMeta, Overview, OverviewChanged, Profile};
use crate::{hook_meta, inspect, service};

fn layout_for(app: &tauri::AppHandle, agent: Agent) -> Result<Layout, SymlinkError> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|err| SymlinkError::AppDataDir(err.to_string()))?
        .join("managed")
        .join(agent.slug());
    Ok(Layout::new(agent, agent.config_dir()?, root))
}

#[tauri::command]
#[specta::specta]
pub fn agent_overview(app: tauri::AppHandle, agent: Agent) -> Result<Overview, SymlinkError> {
    inspect::overview(&layout_for(&app, agent)?)
}

#[tauri::command]
#[specta::specta]
pub fn adopt(app: tauri::AppHandle, agent: Agent) -> Result<(), SymlinkError> {
    service::adopt(&layout_for(&app, agent)?)?;
    OverviewChanged { agent }.emit(&app).ok();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn import_unmanaged(app: tauri::AppHandle, agent: Agent) -> Result<(), SymlinkError> {
    service::import_unmanaged(&layout_for(&app, agent)?)?;
    OverviewChanged { agent }.emit(&app).ok();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn save_profile(
    app: tauri::AppHandle,
    agent: Agent,
    profile: Profile,
) -> Result<(), SymlinkError> {
    service::save_profile(&layout_for(&app, agent)?, profile)?;
    OverviewChanged { agent }.emit(&app).ok();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn delete_profile(
    app: tauri::AppHandle,
    agent: Agent,
    name: String,
) -> Result<(), SymlinkError> {
    service::delete_profile(&layout_for(&app, agent)?, &name)?;
    OverviewChanged { agent }.emit(&app).ok();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn activate_profile(
    app: tauri::AppHandle,
    agent: Agent,
    name: String,
) -> Result<(), SymlinkError> {
    service::activate_profile(&layout_for(&app, agent)?, &name)?;
    OverviewChanged { agent }.emit(&app).ok();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn unlink_kind(app: tauri::AppHandle, agent: Agent, kind: Kind) -> Result<(), SymlinkError> {
    service::unlink_kind(&layout_for(&app, agent)?, kind)?;
    OverviewChanged { agent }.emit(&app).ok();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_hook_meta(
    app: tauri::AppHandle,
    agent: Agent,
    name: String,
) -> Result<HookMeta, SymlinkError> {
    hook_meta::load(&layout_for(&app, agent)?, &name)
}

#[tauri::command]
#[specta::specta]
pub fn save_hook_meta(
    app: tauri::AppHandle,
    agent: Agent,
    name: String,
    meta: HookMeta,
) -> Result<(), SymlinkError> {
    hook_meta::save(&layout_for(&app, agent)?, &name, &meta)
}
