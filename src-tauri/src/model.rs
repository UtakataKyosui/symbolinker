use serde::{Deserialize, Serialize};
use specta::Type;

use crate::agent::Kind;

/// 種類ごとの項目名の一覧。ライブラリの内容にも、 Profile の有効項目にも使う。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Items {
    pub skills: Vec<String>,
    pub agents: Vec<String>,
    pub hooks: Vec<String>,
    pub rules: Vec<String>,
}

impl Items {
    pub fn get(&self, kind: Kind) -> &Vec<String> {
        match kind {
            Kind::Skills => &self.skills,
            Kind::Agents => &self.agents,
            Kind::Hooks => &self.hooks,
            Kind::Rules => &self.rules,
        }
    }

    pub fn get_mut(&mut self, kind: Kind) -> &mut Vec<String> {
        match kind {
            Kind::Skills => &mut self.skills,
            Kind::Agents => &mut self.agents,
            Kind::Hooks => &mut self.hooks,
            Kind::Rules => &mut self.rules,
        }
    }
}

/// 各 Skill / SubAgent / Hook / Rule の有効状態をまとめたもの。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub name: String,
    pub enabled: Items,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct State {
    pub active: String,
    #[serde(alias = "sets")]
    pub profiles: Vec<Profile>,
}

/// Agent 側ディレクトリ 1 種類分の現況。
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct KindStatus {
    pub kind: Kind,
    pub dir_path: String,
    /// ディレクトリ自体がシンボリックリンクで、変更対象外になっている
    pub dir_is_symlink: bool,
    /// このアプリが置いたリンク
    pub linked: Vec<String>,
    /// Agent が管理している項目(対象外)
    pub system: Vec<String>,
    /// ユーザーが置いたが、まだ取り込まれていない項目
    pub unmanaged: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub adopted: bool,
    pub active: Option<String>,
    pub profiles: Vec<Profile>,
    pub library: Items,
    pub links: Vec<KindStatus>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_and_get_mut_address_the_same_field_per_kind() {
        let mut items = Items::default();
        for (i, kind) in Kind::ALL.into_iter().enumerate() {
            items.get_mut(kind).push(format!("n{i}"));
        }
        assert_eq!(items.skills, ["n0"]);
        assert_eq!(items.agents, ["n1"]);
        assert_eq!(items.hooks, ["n2"]);
        assert_eq!(items.rules, ["n3"]);
        for (i, kind) in Kind::ALL.into_iter().enumerate() {
            assert_eq!(items.get(kind), &vec![format!("n{i}")]);
        }
    }
}
