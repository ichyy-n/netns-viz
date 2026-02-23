# netns-viz

Linux ネットワーク名前空間 (network namespace) のトポロジを GUI で構築・操作できるデスクトップアプリケーションです。

Docker コンテナ上で動作する Linux ネットワーク名前空間を、ドラッグ＆ドロップのビジュアルキャンバスで作成・接続・管理できます。ネットワーク学習、構成テスト、トポロジの試作に最適です。

## 主な機能

- **ビジュアルトポロジエディタ** — ドラッグ＆ドロップで名前空間を配置し、veth ペアで接続
- **ブリッジ (L2 スイッチ)** — 名前空間内にブリッジを作成し、複数インターフェースを接続
- **VLAN** — インターフェースへのタグVLAN（802.1Q サブインターフェース）追加、ブリッジの VLAN フィルタリング有効化、ブリッジポートごとの VLAN ID (pvid/untagged) 設定
- **IP / MAC アドレス管理** — GUI 上で IP 割り当て、MAC アドレス変更が可能
- **ルーティング設定** — 名前空間ごとのルーティングテーブル表示・設定
- **統合ターミナル** — 各名前空間やホスト上で直接コマンドを実行（複数タブ対応）
- **トポロジの保存・読み込み** — JSON ファイルに保存し、いつでも復元
- **セットアップスクリプト生成** — 構築したトポロジをシェルスクリプトとして出力
- **実行ログ** — 実行された Docker コマンドをリアルタイム表示

## 必要な環境

- **Docker Desktop** (起動済みであること)
- macOS または Windows

## インストール

[Releases](../../releases) ページから最新版をダウンロードしてください。

- **macOS (Apple Silicon)**: `netns-viz-x.x.x-arm64.dmg`
- **Windows**: `netns-viz-x.x.x-setup.exe`

### macOS

dmg を開き、`netns-viz.app` を Applications フォルダにドラッグしてください。

> 初回起動時に「開発元が未確認」と表示される場合は、システム設定 > プライバシーとセキュリティ から「このまま開く」を選択してください。

### Windows

exe インストーラーを実行してください。

## 使い方

1. Docker Desktop が起動していることを確認
2. アプリを起動し、左上の **「Docker 起動」** ボタンをクリック
3. Docker コンテナが起動したら、キャンバス上で名前空間を作成
4. 名前空間間を veth ペアで接続し、IP アドレスを設定
5. ターミナルを開いて `ping` や `traceroute` などで疎通確認

## 開発

```bash
# 依存関係のインストール
npm install

# 開発モードで起動 (Vite dev server + Electron)
npm run dev              # Vite dev server を起動
npm run electron:dev     # 別ターミナルで Electron を起動

# 本番ビルド
npm run electron:build
```

## 技術スタック

- **フロントエンド**: React, Vite
- **デスクトップ**: Electron
- **コンテナ管理**: dockerode
- **ビルド**: electron-builder

## ライセンス

MIT
