# 用語集

コード・UI・ドキュメントでは以下の用語を使う。「旧名・別名」の列にある語は新規に使わず、触れる機会があれば正式名へ寄せる。

## 中心概念

| 用語           | 定義                                                                                                                                           | コード上の表現                                   | 旧名・別名                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------- |
| Agent          | Harness を適用する対象の Coding Agent(Claude Code / Codex)。設定ディレクトリは `~/.<slug>`                                                     | `Agent` (`claude` / `codex`)                     | Harness(この意味では使わない) |
| Harness        | Agent をユーザーの思うように動かすための制御ツール群・プロンプト群。Item の総体を指す                                                          | UI の `harness/` コンポーネント群                | —                             |
| Kind           | Item の分類。Skill / SubAgent / Hook / Rule の 4 種                                                                                            | `Kind` (`skills` / `agents` / `hooks` / `rules`) | —                             |
| Item           | Harness を構成する個々の要素(1 つの Skill、1 つの Hook など)。Kind ごとのディレクトリ直下のエントリ 1 つに対応する                             | `Items`(Kind ごとの Item 名一覧)                 | —                             |
| SubAgent       | Kind の 1 つ。Agent 用のサブエージェント定義。ディレクトリ名・`Kind::Agents` は `agents` のままだが、文書では Agent と区別して SubAgent と呼ぶ | `Kind::Agents`                                   | Agent(この意味では使わない)   |
| Profile        | どの Item を有効にするかの組み合わせ。名前を持ち、Agent ごとに複数定義でき、そのうち 1 つが有効(active)                                        | `Profile`, `State.profiles`, `profile_ops`       | Set, ConfigSet                |
| Active Profile | 現在 Agent 側にリンクとして反映されている Profile                                                                                              | `State.active`, `active_profile`                 | —                             |
| Library        | アプリが管理する Item の実体置き場。`<app_data>/managed/<agent>/library/<kind>/<item>`                                                         | `Layout::library_dir`, `inspect::library`        | —                             |
| State          | Profile 定義と Active Profile を保存したもの。`<app_data>/managed/<agent>/state.json`                                                          | `State`, `state_repo`                            | —                             |

## 操作

| 用語      | 定義                                                                                                                                                                                 | コード上の表現                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Adopt     | Agent を初めてアプリの管理下に置く操作。Agent 側の Unmanaged Item を Library へ移し、全 Item を有効にした `default` Profile を作って有効化する。State が無い状態を「未 Adopt」と呼ぶ | `service::adopt`, `Overview.adopted`, `SymlinkError::NotAdopted` |
| Import    | Adopt 後に Agent 側へ置かれた Unmanaged Item を Library へ移し、Active Profile にだけ追加する                                                                                        | `service::import_unmanaged`, `import`                            |
| Activate  | 指定 Profile を Active Profile にし、その内容に合わせて Agent 側のリンクを張り替える                                                                                                 | `service::activate_profile`, `profile_ops::activate`             |
| Reconcile | Active Profile の有効 Item と Agent 側のリンクを一致させる(リンクの追加・削除)。アプリが置いたリンク以外は触らない                                                                   | `reconcile::write_links`                                         |
| Unlink    | 1 つの Kind について、アプリが置いたリンクをすべて外す。Library と Profile は変えない                                                                                                | `service::unlink_kind`, `remove_owned_links`                     |

## Agent 側ディレクトリ内の Item の区分

Agent の `<config_dir>/<kind>/` 直下のエントリは、次のいずれかに分類する。これが Item の状態の正式な区分である。

| 区分      | 定義                                                                                                            | コード上の表現                                     |
| --------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Linked    | アプリが Library の同名 Item へ向けて置いたシンボリックリンク(Owned Link)                                       | `KindStatus.linked`, `inspect::is_owned`           |
| System    | Agent 自身が管理する Item。管理対象に含めず、触らない(例: Claude の `skills/synced`、Codex の `skills/.system`) | `KindStatus.system`, `Agent::system_entries`       |
| Unmanaged | ユーザーが置いたが、まだ Library に取り込まれていない Item。Adopt / Import の対象                               | `KindStatus.unmanaged`, `inspect::unmanaged_items` |

- Kind のディレクトリ自体がシンボリックリンクの場合、その Kind は変更対象外とする(`KindStatus.dir_is_symlink`)。
- `.DS_Store` などの無視対象はどの区分にも含めない(`layout::is_ignored`)。
- UI モックの `Mounted` / `Collision` / `Unlinked` / `Broken`(`src/lib/harness-data.ts`)は正式な区分ではない。UI をバックエンドに接続する際に上記の区分へ合わせる。
