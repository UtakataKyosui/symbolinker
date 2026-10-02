# symbolinker

symbolic linkを管理して、Roleや言語、使用フレームワークごとにAgent Harnessの切り替えを行うツール

## UI preview

Stitchの「AI Harness Switcher」デザインをもとに、React 19とshadcn/uiでDashboard、Skills、Hooks、Profiles、Symlink Inspector、Workspace Settingsを実装しています。デザインの参照先と配色は[DESIGN.md](./DESIGN.md)に記載しています。

`vp run dev`で起動し、`http://localhost:1420`で表示できます。検索、プロフィール切り替え、マトリクス編集、スキルの有効化、フックのシミュレーション、JSONエクスポートに対応しています。設定はブラウザ内に保存されます。ファイルシステム操作とフックの実行はバックエンド未接続のためプレビューです。

検証: `vp check src index.html DESIGN.md`、`vp test`、`vp run build`。

# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
