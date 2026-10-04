# symbolinker

symbolic linkを管理して、Roleや言語、使用フレームワークごとにAgent Harnessの切り替えを行うツール

## インストール

[Releases](https://github.com/UtakataKyosui/symbolinker/releases)から環境に合ったファイルをダウンロードします。

このアプリはコード署名・公証をしていないため、OS の警告が出ます。以下の手順で開いてください。

### macOS

Apple Silicon は `aarch64.dmg`、Intel Mac は `x64.dmg` を使います。

1. dmg を開き、`symlinker.app` を `Applications` へドラッグします。
2. 初回は、Finder で `symlinker.app` を右クリックして「開く」を選び、表示されたダイアログでもう一度「開く」を押します。
3. 「壊れているため開けません」と表示される場合は、ターミナルで隔離属性を外します。

```sh
xattr -dr com.apple.quarantine /Applications/symlinker.app
```

macOS 15 以降で右クリックから開けない場合は、「システム設定 > プライバシーとセキュリティ」の下部にある「このまま開く」を押します。

### Windows

`x64-setup.exe` または `x64_en-US.msi` を実行します。SmartScreen の「WindowsによってPCが保護されました」が出たら、「詳細情報」を押して「実行」を選びます。

### Linux

- AppImage: `chmod +x symlinker_*.AppImage` で実行権限を付けて起動します。
- Debian / Ubuntu: `sudo apt install ./symlinker_*.deb`
- Fedora / RHEL: `sudo dnf install ./symlinker-*.rpm`

## CLI の起動と運用

CLI は GUI とは別の `symlinker-cli` 実行ファイルです。現在のリリース設定には CLI の配布・PATH 登録がないため、ソースからビルドして利用します。Rust と、このリポジトリの Tauri ビルド環境が必要です。

リポジトリのルートで、まずヘルプを表示します。

```sh
cargo run --manifest-path src-tauri/Cargo.toml --bin symlinker-cli -- --help
cargo run --manifest-path src-tauri/Cargo.toml --bin symlinker-cli -- --agent claude overview
```

日常利用では以下でインストールします。`~/.cargo/bin` が PATH に入っていれば、任意のディレクトリから呼び出せます。

```sh
cargo install --path src-tauri --bin symlinker-cli --locked
symlinker-cli --agent claude overview
symlinker-cli --agent codex --json overview
```

`overview` は状態確認です。未 Adopt の Agent は `adopt` で管理を開始し、以後は `activate` で既存の Profile を切り替えます。GUI で Adopt 済みなら、CLI で再度 Adopt する必要はありません。

```sh
# Unmanaged Item の実体を Library へ移し、default Profile を有効化
symlinker-cli --agent claude adopt

# 保存済み Profile へ切り替え（Agent 側のリンクを変更）
symlinker-cli --agent claude activate work

# 後から追加した Unmanaged Item を Library と Active Profile に取り込む
symlinker-cli --agent claude import

# Active Profile に合わせてリンクを復元
symlinker-cli --agent claude reconcile
```

GUI と CLI は同じ Library・State を使います。macOS の管理ルートは `~/Library/Application Support/com.taikiamo.symlinker/managed/<agent>`、Agent 側は `~/.claude` または `~/.codex` です。CLI 操作後は GUI の Refresh で再読み込みしてください。

検証用の別ディレクトリを使う場合は `--config-dir` と `--root` の両方を指定します。`--agent`、`--json` などの共通オプションはサブコマンドより前に置きます。その他の操作は `symlinker-cli --help` と各サブコマンドの `--help` で確認できます。

## GUI の開発起動

Stitchの「AI Harness Switcher」デザインをもとに、React 19とshadcn/uiでDashboard、Skills、Hooks、Profiles、Symlink Inspector、Workspace Settingsを実装しています。デザインの参照先と配色は[DESIGN.md](./DESIGN.md)に記載しています。

`vp install` の後、`vp run tauri dev` でバックエンドを含むデスクトップアプリを起動します。`vp run dev` は `http://localhost:1420` でフロントエンドのみを起動します。現在の UI は Tauri バックエンドに接続するため、通常のブラウザだけでは Library・Profile の取得やファイルシステム操作はできません。

検証: `vp check src index.html DESIGN.md`、`vp test`、`vp run build`。

# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
