use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::error::SymlinkError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum Agent {
    Claude,
    Codex,
}

impl Agent {
    pub fn slug(self) -> &'static str {
        match self {
            Agent::Claude => "claude",
            Agent::Codex => "codex",
        }
    }

    /// Agent 自身が管理していて、ユーザーの管理対象に含めない項目名。
    pub fn system_entries(self, kind: Kind) -> &'static [&'static str] {
        match (self, kind) {
            (Agent::Claude, Kind::Skills) => &["synced"],
            (Agent::Codex, Kind::Skills) => &[".system"],
            _ => &[],
        }
    }

    pub fn config_dir(self) -> Result<PathBuf, SymlinkError> {
        dirs::home_dir()
            .map(|home| home.join(format!(".{}", self.slug())))
            .ok_or(SymlinkError::HomeDirNotFound)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Skills,
    Agents,
    Hooks,
    Rules,
}

impl Kind {
    pub const ALL: [Kind; 4] = [Kind::Skills, Kind::Agents, Kind::Hooks, Kind::Rules];

    pub fn dir_name(self) -> &'static str {
        match self {
            Kind::Skills => "skills",
            Kind::Agents => "agents",
            Kind::Hooks => "hooks",
            Kind::Rules => "rules",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slug_and_dir_names() {
        assert_eq!(Agent::Claude.slug(), "claude");
        assert_eq!(Agent::Codex.slug(), "codex");
        let dirs: Vec<_> = Kind::ALL.iter().map(|k| k.dir_name()).collect();
        assert_eq!(dirs, ["skills", "agents", "hooks", "rules"]);
    }

    #[test]
    fn system_entries_are_defined_per_agent_and_kind() {
        assert_eq!(Agent::Claude.system_entries(Kind::Skills), ["synced"]);
        assert_eq!(Agent::Codex.system_entries(Kind::Skills), [".system"]);
        for kind in [Kind::Agents, Kind::Hooks, Kind::Rules] {
            assert!(Agent::Claude.system_entries(kind).is_empty());
            assert!(Agent::Codex.system_entries(kind).is_empty());
        }
    }
}
