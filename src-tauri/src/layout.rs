use std::path::{Path, PathBuf};

use crate::agent::{Agent, Kind};

const IGNORED_ENTRIES: [&str; 1] = [".DS_Store"];

pub fn is_ignored(name: &str) -> bool {
    IGNORED_ENTRIES.contains(&name)
}

/// 1 つの Agent に対する、ディスク上の配置。パスの導出だけを担い、I/O はしない。
///
/// ```text
/// root/library/<kind>/<item>   実体(取り込んだもの、アプリで作るもの)
/// root/state.json              Profile 定義と有効な Profile
/// config_dir/<kind>/<item>     有効な項目ごとの library へのリンク
/// ```
#[derive(Debug, Clone)]
pub struct Layout {
    agent: Agent,
    config_dir: PathBuf,
    root: PathBuf,
}

impl Layout {
    pub fn new(agent: Agent, config_dir: PathBuf, root: PathBuf) -> Self {
        Self {
            agent,
            config_dir,
            root,
        }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn library_dir(&self, kind: Kind) -> PathBuf {
        self.root.join("library").join(kind.dir_name())
    }

    pub fn agent_dir(&self, kind: Kind) -> PathBuf {
        self.config_dir.join(kind.dir_name())
    }

    pub fn state_path(&self) -> PathBuf {
        self.root.join("state.json")
    }

    pub fn hook_meta_path(&self, name: &str) -> PathBuf {
        self.root.join("meta").join("hooks").join(format!("{name}.json"))
    }

    pub fn is_system(&self, kind: Kind, name: &str) -> bool {
        self.agent.system_entries(kind).contains(&name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn layout(agent: Agent) -> Layout {
        Layout::new(agent, "/home/u/.agent".into(), "/data/managed/agent".into())
    }

    #[test]
    fn derives_paths_without_touching_the_filesystem() {
        let l = layout(Agent::Claude);
        assert_eq!(l.root(), Path::new("/data/managed/agent"));
        assert_eq!(
            l.library_dir(Kind::Hooks),
            Path::new("/data/managed/agent/library/hooks")
        );
        assert_eq!(l.agent_dir(Kind::Rules), Path::new("/home/u/.agent/rules"));
        assert_eq!(l.state_path(), Path::new("/data/managed/agent/state.json"));
    }

    #[test]
    fn is_system_follows_the_agent_rules() {
        assert!(layout(Agent::Codex).is_system(Kind::Skills, ".system"));
        assert!(!layout(Agent::Codex).is_system(Kind::Skills, "synced"));
        assert!(layout(Agent::Claude).is_system(Kind::Skills, "synced"));
        assert!(!layout(Agent::Claude).is_system(Kind::Hooks, "synced"));
    }

    #[test]
    fn ignored_entries() {
        assert!(is_ignored(".DS_Store"));
        assert!(!is_ignored(".system"));
    }
}
