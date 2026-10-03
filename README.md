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

## UI preview

Stitchの「AI Harness Switcher」デザインをもとに、React 19とshadcn/uiでDashboard、Skills、Hooks、Profiles、Symlink Inspector、Workspace Settingsを実装しています。デザインの参照先と配色は[DESIGN.md](./DESIGN.md)に記載しています。

`vp run dev`で起動し、`http://localhost:1420`で表示できます。検索、プロフィール切り替え、マトリクス編集、スキルの有効化、フックのシミュレーション、JSONエクスポートに対応しています。設定はブラウザ内に保存されます。ファイルシステム操作とフックの実行はバックエンド未接続のためプレビューです。

検証: `vp check src index.html DESIGN.md`、`vp test`、`vp run build`。

# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
