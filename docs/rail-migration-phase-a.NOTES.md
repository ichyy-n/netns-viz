# Rail Phase A 指示書 訂正ノート

本ファイルは `docs/rail-migration-phase-a.md`（Claude Design 原指示書）の訂正一覧。
実装は本 NOTES と task YAML (`queue/tasks/ashigaru1.yaml` subtask_149a) を正とし、原文に差異がある場合は本 NOTES を優先する。

## 訂正一覧（将軍 6 点 + 実装都合）

### 修正1: ストレージ命名の扱い
- **原文**: L35「sessionStorage の netns-viz:gui-state:v1 の JSON shape が変わらない」、L564「sessionStorage.getItem('netns-viz:gui-state:v1')」
- **task YAML 修正1**: 「sessionStorage 誤記 → localStorage 統一」
- **家老裁定 (2026-04-19T15:44)**: 解釈Aを採用。**実装は `window.sessionStorage` のまま**（`src/logic/state.js` diff=0 厳守）。`cmd_149` 草案および snapshot 出力ファイル名 `localstorage.json` は慣習的命名であり、実ストレージは sessionStorage を指す。
- **本実装の正**: `src/logic/state.js` の `window.sessionStorage.getItem/setItem(GUI_STATE_KEY)` を一切変更しない。snapshot は既存 `scripts/refactor_snapshot.mjs` を流用し、内部で sessionStorage を取得する（ファイル名は継続的に localstorage.json のエイリアスとする）。

### 修正2: Canvas.jsx の扱い
- **原文 Step 8 意図**: 「Canvas の背景色だけ TOKENS.bg に揃える（COLORS.bg の値を #0a0a0c に上書き、または Canvas.jsx の rect fill を TOKENS.bg 参照に変える）」
- **御意見番指摘 (P1)**: 外側 div ラップでは SVG 内の全面 `<rect fill={COLORS.bg}>` に覆われ、視覚的に背景色を変更不可能。AC「reference.png と見分けつかない」と「Canvas.jsx diff=0」は両立不能。
- **task YAML 修正2**: Canvas.jsx は L6 `<rect>` の `fill={COLORS.bg}` → `fill={TOKENS.bg}`、L7 `<circle>` の `fill="#1e293b"` → `fill={TOKENS.textFaint}` の **色定数参照 2 行のみ diff 許容**。その他の Canvas.jsx 変更は禁止。他 canvas/ ファイル（NamespaceNode / VethEdge / BridgePort）は diff=0。
- **本実装の正**: Step 9 で 2 行のみを置換し、コミットを分離する。

### 修正3: ブランチ戦略
- **原文**: 明示なし（main 直接コミット前提の記載）
- **task YAML 修正3**: `main(a8e2d2f)` から `feature/rail-phase-a` を切り、全作業を同ブランチで実施。main マージは別 cmd。

### 修正4: 機械検証の追加
- **原文**: 見た目比較のみ
- **御意見番指摘 (P3)**: SVG DOM snapshot の bit-identical / 構造等価性検証が未設計。
- **task YAML 修正4**: `docs/_snapshot/phase-a-before.{json,svg}` vs `phase-a-after.{json,svg}` の比較を Step 11 に追加。sessionStorage JSON は bit-identical、SVG は構造等価（ラップ DOM 階層差 + Canvas.jsx の色定数参照差を除き、ノード／エッジ／ポートの要素数・属性・構造が不変）。

### 修正5: コミット粒度
- **原文**: 8 ステップ単位
- **task YAML 修正5**: 11〜13 commit 目安、各 commit で build が通る状態を維持。

### 修正6: 工数見積り
- **原文**: 3h50m / 6〜8h
- **task YAML 修正6**: 8〜10h（Electron 実機起動・snapshot 取得・console.error 点検を含む現実線）。

## その他メモ

- LeftRail の expand 状態（ネットワーク／スイッチ／ホスト／VLAN／リンクの折りたたみ）は Phase A では **session 内 useState のみ**。sessionStorage 永続化は実施しない（Phase B/C で必要になった時点で追加）。
- Google Fonts 読込には Electron CSP に `font-src https://fonts.gstatic.com` / `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'` の許可が必要。未許可なら Step 10 の同コミットで最小限の CSP 更新を行う。
- Canvas 内部（NamespaceNode / VethEdge / BridgePort / Canvas.jsx の L6/L7 以外）は Phase B で差し替え予定。Phase A では**触らない**。
