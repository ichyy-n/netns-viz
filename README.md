# netns-viz

netns-viz は、Docker コンテナ内の Linux network namespace を GUI で作成・接続・検証するデスクトップアプリケーションです。

namespace、veth、bridge、VLAN、route、iptables などをビジュアルキャンバスとインスペクタから操作できます。ネットワーク学習、構成検証、小規模トポロジの試作に向いています。

## 主な機能

### トポロジ編集

- namespace の作成、削除、ドラッグ配置
- キャンバスのパン、ズーム、配置の保存
- veth pair による namespace 間接続
- bridge の作成と bridge port 管理
- namespace の状態に応じた role 表示
  - host
  - router
  - switch
- namespace カード上での IP、MAC、VLAN、TRUNK、bridge 情報の表示

### インスペクタ

- 選択した namespace の概要表示
- `ip_forward` の ON/OFF
- interface の IP / MAC アドレス編集
- interface の削除
- bridge の VLAN filtering 切り替え
- bridge port の VLAN 設定
- VLAN sub-interface の作成
- namespace ごとのターミナル起動
- namespace の削除

### テーブル表示と編集

- ルーティングテーブル
  - `ip route show` の表示
  - route の追加
  - route の削除
  - destination の `default` / CIDR 形式チェック
- ARP テーブル
  - `ip neigh show` の表示
  - 手動更新
- MAC address table
  - bridge FDB の表示
  - learned entry の絞り込み
- iptables
  - `filter` / `nat` / `mangle` / `raw` table の表示
  - rule の追加
  - rule の削除
  - 保存済みトポロジ読み込み時の再適用

### VLAN

- 802.1Q VLAN sub-interface の作成
- bridge VLAN filtering の有効化
- bridge port の access / trunk / custom 設定
- access VLAN、trunk VLAN、native VLAN、PVID、untagged の設定
- bridge 自身への VLAN 設定

### ターミナルとログ

- namespace ごとの統合ターミナル
- Docker コンテナ内 root namespace のホストターミナル
- 複数タブのターミナル
- コマンド履歴、Ctrl+C、Ctrl+L
- 実行ログの表示
- リサイズ可能なボトムウィンドウ

### 保存、読み込み、コマンド生成

- トポロジの JSON 保存
- 保存したトポロジの読み込みと再構築
- `ip_forward`、VLAN、route、iptables の復元
- GUI 状態の自動保存
- 構築内容からセットアップ用シェルスクリプトを生成
- namespace ごとのカスタムコマンド追加

### Docker 連携

- Docker Desktop 上で検証用コンテナを起動
- アプリ起動後の Docker 接続確認
- コンテナ再接続
- スリープ復帰後の再同期
- 必要な network namespace / veth / bridge / route / VLAN / iptables 設定の再適用

## 必要な環境

- Docker Desktop
- macOS または Windows

Docker Desktop は起動済みである必要があります。

## インストール

[Releases](../../releases) ページから最新版をダウンロードしてください。

- macOS Apple Silicon: `netns-viz-x.x.x-arm64.dmg`
- Windows: `netns-viz-x.x.x-setup.exe`

### macOS

dmg を開き、`netns-viz.app` を Applications フォルダにドラッグしてください。

初回起動時に「開発元が未確認」と表示される場合は、システム設定 > プライバシーとセキュリティ から「このまま開く」を選択してください。

### Windows

exe インストーラーを実行してください。

## 使い方

1. Docker Desktop を起動します。
2. netns-viz を起動し、右上の `Docker 未接続` をクリックします。
3. namespace を作成します。
4. veth pair、bridge、VLAN、IP アドレス、route、iptables などを設定します。
5. ターミナル、ルーティングテーブル、ARP テーブル、MAC address table、iptables で動作を確認します。
6. 必要に応じて JSON 保存、読み込み、セットアップスクリプト生成を使います。

## 開発

```bash
npm install
```

開発時は Vite と Electron を別々に起動します。

```bash
npm run dev
npm run electron:dev
```

本番ビルド:

```bash
npm run electron:build
```

Vite ビルドのみ:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## 技術スタック

- React
- Vite
- Electron
- dockerode
- electron-builder

## ライセンス

MIT
