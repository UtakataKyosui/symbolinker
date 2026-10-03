use std::io;

use serde::Serialize;
use specta::Type;

#[derive(Debug, thiserror::Error)]
pub enum SymlinkError {
    #[error("ホームディレクトリを特定できません")]
    HomeDirNotFound,
    #[error("アプリのデータディレクトリを特定できません: {0}")]
    AppDataDir(String),
    #[error("名前が不正です: {0:?}")]
    InvalidName(String),
    #[error("既に存在するため処理できません: {0}")]
    AlreadyExists(String),
    #[error("ディレクトリ自体がシンボリックリンクのため変更しません: {0}")]
    ForeignLink(String),
    #[error("ライブラリに項目がありません: {0}")]
    ItemNotFound(String),
    #[error("Profile が見つかりません: {0}")]
    ProfileNotFound(String),
    #[error("有効な Profile は削除できません: {0}")]
    ProfileIsActive(String),
    #[error("既に取り込み済みです")]
    AlreadyAdopted,
    #[error("まだ取り込まれていません")]
    NotAdopted,
    #[error("状態ファイルの読み書きに失敗しました: {0}")]
    Json(#[from] serde_json::Error),
    #[error("I/O エラー: {0}")]
    Io(#[from] io::Error),
}

impl SymlinkError {
    /// CLI の終了コード。3 はドメイン上の拒否、4 は環境・ストレージの障害。
    pub fn exit_code(&self) -> i32 {
        match self {
            SymlinkError::HomeDirNotFound
            | SymlinkError::AppDataDir(_)
            | SymlinkError::Json(_)
            | SymlinkError::Io(_) => 4,
            SymlinkError::InvalidName(_)
            | SymlinkError::AlreadyExists(_)
            | SymlinkError::ForeignLink(_)
            | SymlinkError::ItemNotFound(_)
            | SymlinkError::ProfileNotFound(_)
            | SymlinkError::ProfileIsActive(_)
            | SymlinkError::AlreadyAdopted
            | SymlinkError::NotAdopted => 3,
        }
    }
}

impl Serialize for SymlinkError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

impl Type for SymlinkError {
    fn definition(types: &mut specta::Types) -> specta::datatype::DataType {
        String::definition(types)
    }
}
