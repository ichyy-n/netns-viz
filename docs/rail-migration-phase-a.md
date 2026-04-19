# netns-viz — Rail 移行 Phase A 指示書
# 「殻を Rail 化」

## 目的
`netns-viz-rail.html` と**シェル部分だけは見分けがつかない**状態にする。Canvas の中身（ノード描画・リンク描画）は既存のまま残す（Phase B で差し替え）。

## 基準画像
`docs/rail-reference.png`

この 1 枚が Phase A の完了判定画像。状態：
- 言語 = `jp`（日本語固定）
- view = `canvas`
- selectedId = `sw1`
- CommandLog = 展開
- ⌘K パレット = 閉
- TweaksPanel = 閉

## 完了判定

**見た目**（基準画像との比較）
- [ ] トップバー（左 netns-viz ロゴ → Workspace → ファイル名 / 右 Docker 接続中 → JP → ターミナル → トポロジを適用）
- [ ] セカンダリツールバー（左：キャンバス/リスト/テーブルの 3 タブ / 区切り / + 名前空間・ブリッジ・veth ペア・VLAN / 右：⌘K 検索ボックス + 歯車）
- [ ] 左 Rail（244px）：ネットワーク / スイッチ / ホスト / VLAN / リンクの折りたたみツリー + 下部 CommandLog
- [ ] 右 Inspector（300px）：選択 ns のプロパティ表示、`selected=null` なら empty state
- [ ] フォント：Inter + JetBrains Mono、日本語のみ Noto Sans JP フォールバック
- [ ] カラー：`TOKENS.bg = #0a0a0c`、アクセント `indigo = #7b7ee8`

**機能（絶対に崩さない）**
- [ ] Docker 起動 / 停止 / resume
- [ ] `samples/ch01_vlan.json` 読み込み → Canvas に 6 ns / 2 bridge / 5 veth が表示
- [ ] 名前空間・ブリッジ・veth・VLAN 追加（モーダル経由、中身変更なし）
- [ ] トポロジ保存 / 読込 / Apply
- [ ] ターミナル（Ns / Host）
- [ ] ページリロード後の state 復元
- [ ] `sessionStorage` の `netns-viz:gui-state:v1` の JSON shape が変わらない

**diff**
- [ ] `src/logic/` `src/ipc/` の `git diff --stat` が 0
- [ ] 既存の `src/ui/canvas/` `src/ui/modals/` `src/ui/terminal/` `src/ui/primitives/` は**削除も変更も禁止**（Phase A では存在したままで良い）
- [ ] `src/theme.js` に TOKENS / ICONS / LABELS_JP を**追記**（既存 `COLORS` などは残す）

## やらないこと（Phase B/C 送り）
- Canvas 内のノード・リンクの描画変更（Phase B）
- 自動レイアウト（Phase B）
- モーダルの見た目変更（Phase C）
- Inspector からのインライン編集（Phase C）
- ⌘K パレットの実機能実装（今回は UI だけ、候補も `CH01` からダミー表示でよい）
- List view / Table view の中身実装（タブは出すが中身「Coming soon」）
- EN/JP トグル機能（ボタンは出すが日本語固定で動作）

## ディレクトリ

```
src/
├── theme.js                          # TOKENS / ICONS / LABELS_JP を追加
├── logic/
│   └── rail-view.js                  # 新設：実 state → Rail view model 変換
├── ui/
│   ├── shell/                        # 新設
│   │   ├── RailShell.jsx
│   │   ├── TopBar.jsx
│   │   ├── SecondaryToolbar.jsx
│   │   ├── LeftRail.jsx
│   │   ├── Inspector.jsx
│   │   ├── CommandLog.jsx
│   │   ├── CommandPalette.jsx
│   │   ├── Chip.jsx
│   │   └── Dot.jsx
│   └── canvas/                       # 触らない（Phase B で差し替え）
└── App.jsx                           # return を <RailShell> に置換
```

## 作業手順（8 ステップ、各ステップでコミット + 手動確認）

---

### Step 1: theme.js に Rail トークン追加（10分）

`src/theme.js` の末尾に追記。既存 `COLORS` `NS_COLORS` `NS_W` は**消さない**。

```js
// ── Rail design tokens ───────────────────────────────────────────
export const TOKENS = {
  bg: '#0a0a0c',
  bg2: '#0f0f12',
  surface: '#141418',
  surface2: '#1a1a20',
  surfaceHi: '#22222a',
  line: '#26262e',
  lineSoft: '#1e1e24',
  text: '#e8e8ee',
  textMid: '#a8a8b4',
  textDim: '#6a6a76',
  textFaint: '#44444d',

  indigo: '#7b7ee8',
  indigoSoft: 'rgba(123,126,232,0.12)',
  red: '#f15f5f',
  redSoft: 'rgba(241,95,95,0.12)',
  green: '#5ec08a',
  greenSoft: 'rgba(94,192,138,0.12)',
  amber: '#e8b15e',
  amberSoft: 'rgba(232,177,94,0.14)',
  sky: '#5ea3e8',
  skySoft: 'rgba(94,163,232,0.14)',
  magenta: '#d968c7',
  magentaSoft: 'rgba(217,104,199,0.14)',

  vlan10: '#5ea3e8',
  vlan10Soft: 'rgba(94,163,232,0.16)',
  vlan20: '#e8b15e',
  vlan20Soft: 'rgba(232,177,94,0.16)',
  trunk: '#d968c7',
  trunkSoft: 'rgba(217,104,199,0.18)',

  fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  fontMono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
  fontJp:   '"Inter", "Hiragino Sans", "Noto Sans JP", -apple-system, system-ui, sans-serif',
};

// ── Icon paths (Linear-ish stroked, 1.5 width) ────────────────────
// 利用側は <svg viewBox="0 0 24 24" stroke-width="1.5" ...>{ICONS.xxx}</svg> で使う。
// path 文字列は <path d={...} />、React 要素は <>...</> としてそのまま埋め込む。
export const ICONS = {
  plus:    'M12 5v14M5 12h14',
  chevD:   'm6 9 6 6 6-6',
  chevR:   'm9 6 6 6-6 6',
  search:  /* React fragment */ null, // ← 実装時は netns-viz-rail.html L105 から複製
  // ... 以下、netns-viz-rail.html の ICONS オブジェクトを**そのままコピー**すること
};

// ── JP labels (lang 固定) ────────────────────────────────────────
export const LABELS_JP = {
  app: 'netns-viz', workspace: 'ワークスペース',
  file: 'ファイル', new: '新規', open: '開く', save: '保存', export: 'エクスポート',
  docker: 'Docker 起動', dockerOn: 'Docker 接続中',
  addNs: '名前空間', addBridge: 'ブリッジ', addVeth: 'veth ペア', addRoute: 'ルート', addVlan: 'VLAN',
  apply: 'トポロジを適用', terminal: 'ターミナル', cmdLog: 'コマンドログ',
  inspector: 'インスペクタ', properties: 'プロパティ',
  switches: 'スイッチ', hosts: 'ホスト', vlans: 'VLAN', links: 'リンク',
  search: '検索…', searchShort: 'コマンドを実行… (⌘K)',
  canvas: 'キャンバス', list: 'リスト', table: 'テーブル',
  topLeft: 'ネットワーク',
  running: '実行中', up: 'UP', down: 'DOWN',
  shell: 'シェル', logs: 'ログ',
};

// 用途上の「フォントフォールバックつき JP ファミリ」を取り出すヘルパ
export const FONT_JP = TOKENS.fontJp;
```

**`ICONS` は必ず `netns-viz-rail.html` L105〜135 からまるごとコピー**。JSX 混じりなのでそのまま持ってくる。

**確認**：`import { TOKENS, ICONS, LABELS_JP } from './theme.js'` が通る。アプリの見た目は変わらない（使う側がまだない）。

---

### Step 2: プリミティブ `Chip` / `Dot` を新設（15分）

`src/ui/shell/Chip.jsx`：
```jsx
import { TOKENS } from "../../theme.js";

export function Chip({ children, color, soft, size = 'sm', style }) {
  const pad = size === 'sm' ? '2px 6px' : '3px 8px';
  const fs = size === 'sm' ? 9.5 : 10.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, fontSize: fs, fontFamily: TOKENS.fontMono,
      fontWeight: 600, letterSpacing: '0.05em',
      background: soft, color, borderRadius: 3, ...style,
    }}>{children}</span>
  );
}
```

`src/ui/shell/Dot.jsx`：
```jsx
export function Dot({ color, size = 6, style }) {
  return <span style={{ width: size, height: size, borderRadius: size/2,
    background: color, display: 'inline-block', ...style }} />;
}
```

加えて、`netns-viz-rail.html` L88〜92 の **`IconStroke` を `src/ui/shell/IconStroke.jsx` として複製**。そのまま：

```jsx
export const IconStroke = ({ d, size = 14, color = 'currentColor', fill = 'none', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);
```

---

### Step 3: `logic/rail-view.js` を新設（30分）

実アプリ state（`{ namespaces, bridges, veths, vlans, bridgeVlans, routes }`）から、Rail UI が必要とする view model を作る**純粋関数**。React 禁止。

```js
// 実 state → Rail が欲しい形へ変換
//   - ns に role ('switch' | 'host') を付与
//   - ns に vlan (host の場合、代表 VLAN) を付与
//   - bridges を ns ごとにマップ
//   - veths を「リンク」として抽出（kind: 'access' | 'trunk'、vlan / vlans）

export function buildRailView(state) {
  const { namespaces = [], bridges = [], veths = [], bridgeVlans = [] } = state;

  const bridgeByNs = new Map();
  for (const b of bridges) {
    if (!bridgeByNs.has(b.nsId)) bridgeByNs.set(b.nsId, []);
    bridgeByNs.get(b.nsId).push(b);
  }

  const nsView = namespaces.map(ns => {
    const nsBridges = bridgeByNs.get(ns.id) || [];
    const role = nsBridges.length > 0 ? 'switch' : 'host';
    // host の場合、veth の endA/endB の pvid/untagged から代表 VLAN を拾う
    let vlan = null;
    if (role === 'host') {
      for (const v of veths) {
        for (const end of ['endA', 'endB']) {
          if (v[end].nsId !== ns.id) continue;
          // bridgeVlans に紐づく vlan を優先
          const bv = bridgeVlans.find(bv => bv.vethId === v.id && bv.vethEnd !== end);
          if (bv && bv.pvid && bv.untagged) { vlan = bv.vid; break; }
        }
        if (vlan) break;
      }
    }
    return { ...ns, role, vlan, bridges: nsBridges };
  });

  // veth → link
  const linksView = veths.map(v => {
    // bridgeVlans から kind を推定
    const bvA = bridgeVlans.filter(bv => bv.vethId === v.id && bv.vethEnd === 'endA');
    const bvB = bridgeVlans.filter(bv => bv.vethId === v.id && bv.vethEnd === 'endB');
    const allBvs = [...bvA, ...bvB];
    let kind = 'access', vlan = null, vlans = null;
    if (allBvs.length === 0) {
      kind = 'access';
    } else if (allBvs.every(bv => bv.pvid && bv.untagged) && new Set(allBvs.map(bv => bv.vid)).size === 1) {
      kind = 'access';
      vlan = allBvs[0].vid;
    } else {
      kind = 'trunk';
      vlans = [...new Set(allBvs.map(bv => bv.vid))].sort((a,b) => a-b);
    }
    return {
      id: v.id,
      a: { nsId: v.endA.nsId, port: v.endA.name },
      b: { nsId: v.endB.nsId, port: v.endB.name },
      kind, vlan, vlans,
    };
  });

  // 自動レイアウトは Phase B。Phase A は ns.x, ns.y をそのまま使う。
  // 左 Rail の "VLAN" セクション用：全 VLAN ID 集合
  const vlanIds = [...new Set([
    ...bridgeVlans.map(bv => bv.vid),
    ...(state.vlans || []).map(v => v.vlanId || v.vid),
  ])].filter(Boolean).sort((a,b) => a-b);

  return {
    namespaces: nsView,
    bridges,
    veths,
    links: linksView,
    vlanIds,
    switches: nsView.filter(n => n.role === 'switch'),
    hosts:    nsView.filter(n => n.role === 'host'),
  };
}
```

**テスト観点**：`samples/ch01_vlan.json` を読み込んで `buildRailView(state)` を呼ぶと、`switches.length === 2`、`hosts.length === 4`、`links.length === 5`、trunk が 1 本になる。

---

### Step 4: `LeftRail.jsx` 実装（45分）

`netns-viz-rail.html` L352〜442 の `LeftRail` コンポーネントをベースに、props を受けて実データで動くように書き換える。

```jsx
import React from "react";
import { TOKENS, ICONS, LABELS_JP } from "../../theme.js";
import { IconStroke } from "./IconStroke.jsx";
import { Dot } from "./Dot.jsx";
import { CommandLog } from "./CommandLog.jsx";

export function LeftRail({ railView, selectedId, onSelect, hoverId, onHover, execLog, showLog, onToggleLog, projectName = 'ch01-vlan' }) {
  const L = LABELS_JP;
  const [expand, setExpand] = React.useState({ switches: true, hosts: true, vlans: true, links: true });

  const Section = ({ k, label, count }) => (/* Rail HTML L357〜365 そのまま */);
  const Item = ({ id, label, icon, dot, badge, selectable = true, muted = false }) => (/* Rail HTML L367〜393 */);

  return (
    <div style={{ width: 244, borderRight: `1px solid ${TOKENS.line}`,
      background: TOKENS.bg2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 8 }}>
        <Section k="proj" label={L.topLeft} />
        <Item id="_project" label={projectName} icon={ICONS.folder} selectable={false} />

        <Section k="switches" label={L.switches} count={railView.switches.length} />
        {expand.switches && railView.switches.map(n => (
          <Item key={n.id} id={n.id} label={n.name} icon={ICONS.switch}
            badge={`${(n.bridges||[]).length} bridge`} />
        ))}

        <Section k="hosts" label={L.hosts} count={railView.hosts.length} />
        {expand.hosts && railView.hosts.map(n => (
          <Item key={n.id} id={n.id} label={n.name} icon={ICONS.host}
            dot={n.vlan === 10 ? TOKENS.vlan10 : n.vlan === 20 ? TOKENS.vlan20 : null}
            badge={/* 代表 IP を拾う */} />
        ))}

        <Section k="vlans" label={L.vlans} count={railView.vlanIds.length} />
        {expand.vlans && railView.vlanIds.map(vid => (
          <Item key={`vlan${vid}`} id={`_vlan${vid}`} label={`VLAN ${vid}`}
            icon={ICONS.vlan}
            dot={vid === 10 ? TOKENS.vlan10 : vid === 20 ? TOKENS.vlan20 : TOKENS.textMid}
            selectable={false} />
        ))}

        <Section k="links" label={L.links} count={railView.links.length} />
        {expand.links && railView.links.map(l => (
          <Item key={l.id} id={l.id} label={`${l.a.port} ⇄ ${l.b.port}`}
            icon={ICONS.link}
            dot={l.kind === 'trunk' ? TOKENS.trunk : null}
            muted={l.kind !== 'trunk'} selectable={false} />
        ))}
      </div>

      <CommandLog open={showLog} onToggle={onToggleLog} execLog={execLog} />
    </div>
  );
}
```

**代表 IP の拾い方**：`host` ns に属する veth の最初の end の `ip` を使う。なければ空。

---

### Step 5: `CommandLog.jsx` / `TopBar.jsx` / `SecondaryToolbar.jsx` / `CommandPalette.jsx`（各 20〜30分）

`netns-viz-rail.html` から該当コンポーネントをコピーし、以下だけ差し替え：

| Rail デモ | 実アプリでの差し替え |
|---|---|
| `useRail()` → `ctx.lang` | 削除（日本語固定） |
| `L.` → `LABELS_JP.` | 全置換 |
| `CommandLog` 内のダミー `logs` 配列 | props `execLog` から直近 20 件、`{ cmd, output, success, time }` を `{ ok, t, cmd }` にマップ |
| `TopBar` の Docker チップ | props `dockerReady` で `Docker 接続中` / `Docker 起動` を切替（`onStartDocker` ボタン実装） |
| `TopBar` の `ターミナル` ボタン | `onOpenTerminal` prop |
| `TopBar` の `トポロジを適用` ボタン | `onApply` prop |
| `SecondaryToolbar` の `+ 名前空間` 等 | `onAddNs` 等の props |
| `CommandPalette` の候補 | Phase A では `railView.namespaces` から「ノードへ移動」だけ実装、他は placeholder |
| View タブ | `canvas` のみ active、`list` / `table` は `disabled` + tooltip「近日公開」 |

**JP/EN トグルボタン**：UI は残す（クリックで `alert("準備中")` でも可）。内部 lang は `'jp'` 固定。

---

### Step 6: `Inspector.jsx` 実装（30分）

`netns-viz-rail.html` L1167〜1399 の `Inspector` / `InspectorSwitch` / `InspectorHost` / `InspectorEmpty` を複製。差し替え：

- `useRail()` → props 受け取り（`selected`, `onClearSelection`, `railView`, `ipForwardMap`, `iptablesMap`, `onOpenIptables`, `onOpenBridgeVlan`, `onOpenTerminal`）
- `nsById[selectedId]` → `railView.namespaces.find(n => n.id === selected)`
- `buildPortMap()` → `railView.links` から、選択 ns 分を抽出して `{port, vid, flags, kind}[]` を作る（インラインヘルパでよい）
- Phase A では**編集フォームは出さない**。各セクションの値は read-only 表示。フッターの `[シェル]` `[ログ]` ボタンだけ動かす。
  - `[シェル]` → `onOpenTerminal(ns)`
  - `[ログ]` → `onShowLog()`（CommandLog 展開）

**Phase A では載せない**（Phase C で追加）：
- ルート編集、IP/MAC 編集、VLAN 追加
- `BridgeVlanModal` / `IptablesModal` を開くボタンは載せる（`[編集] →` で既存モーダルを開く）

---

### Step 7: `RailShell.jsx` + `App.jsx` 置換（30分）

`src/ui/shell/RailShell.jsx`：

```jsx
import React from "react";
import { TOKENS, LABELS_JP } from "../../theme.js";
import { TopBar } from "./TopBar.jsx";
import { SecondaryToolbar } from "./SecondaryToolbar.jsx";
import { LeftRail } from "./LeftRail.jsx";
import { Inspector } from "./Inspector.jsx";
import { CommandPalette } from "./CommandPalette.jsx";

export function RailShell({
  railView, selected, onSelect,
  dockerReady, dockerLoading, onStartDocker,
  onSave, onLoad, onApply,
  onOpenTerminal, onOpenHostTerminal,
  onAddNs, onAddBridge, onAddVeth, onAddVlan,
  onOpenIptables, onOpenBridgeVlan,
  execLog, showLog, onToggleLog,
  ipForwardMap, iptablesMap,
  projectName,
  // children
  canvas,           // <-- 既存 Canvas をそのまま差し込む
  terminalPane,
  modals,
}) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [hoverId, setHoverId] = React.useState(null);

  // ⌘K
  React.useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setPaletteOpen(v => !v);
      }
      if (e.key === 'Escape' && !paletteOpen) onSelect(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [paletteOpen, onSelect]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: TOKENS.bg,
      color: TOKENS.text, fontFamily: TOKENS.fontJp,
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar projectName={projectName}
        dockerReady={dockerReady} dockerLoading={dockerLoading}
        onStartDocker={onStartDocker} onOpenTerminal={onOpenTerminal}
        onApply={onApply} onSave={onSave} onLoad={onLoad} />
      <SecondaryToolbar onPaletteOpen={() => setPaletteOpen(true)}
        onAddNs={onAddNs} onAddBridge={onAddBridge}
        onAddVeth={onAddVeth} onAddVlan={onAddVlan} />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftRail railView={railView} selectedId={selected} onSelect={onSelect}
          hoverId={hoverId} onHover={setHoverId}
          execLog={execLog} showLog={showLog} onToggleLog={onToggleLog}
          projectName={projectName} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {canvas}
          {terminalPane}
        </div>

        <Inspector selected={selected} onClearSelection={() => onSelect(null)}
          railView={railView}
          ipForwardMap={ipForwardMap} iptablesMap={iptablesMap}
          onOpenIptables={onOpenIptables}
          onOpenBridgeVlan={onOpenBridgeVlan}
          onOpenTerminal={onOpenTerminal}
          onShowLog={() => onToggleLog(true)} />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)}
        railView={railView} onSelect={onSelect} />

      {modals}
    </div>
  );
}
```

`App.jsx` の return を全面差し替え：

```jsx
import { buildRailView } from "./logic/rail-view.js";
import { RailShell } from "./ui/shell/RailShell.jsx";

// ...

const railView = React.useMemo(() => buildRailView(state), [state]);
const [showLog, setShowLog] = useState(true);

return (
  <RailShell
    railView={railView}
    selected={selected}
    onSelect={setSelected}
    dockerReady={dockerReady} dockerLoading={dockerLoading}
    onStartDocker={startDocker}
    onSave={/* 既存の保存ハンドラ */}
    onLoad={/* 既存の読込ハンドラ */}
    onApply={/* 既存の Apply */}
    onOpenTerminal={(ns) => ns ? openTerminal(ns) : openHostTerminal()}
    onAddNs={/* 既存の addNamespace */}
    onAddBridge={/* 既存 */}
    onAddVeth={/* 既存 */}
    onAddVlan={/* 既存 */}
    onOpenIptables={(ns) => setIptablesModal({ ns, newRule: {...} })}
    onOpenBridgeVlan={openBridgeVlanModal}
    execLog={execLog} showLog={showLog} onToggleLog={setShowLog}
    ipForwardMap={ipForwardMap} iptablesMap={iptablesMap}
    projectName="ch01-vlan-trunk.json"
    canvas={
      // 既存の Canvas + NamespaceNode + VethEdge をそのまま差し込む
      <Canvas svgRef={svgRef} panning={panning}
        onMouseDown={/* 既存 */} onWheel={/* 既存 */}
        zoom={zoom} pan={pan}>
        {veths.map(v => <VethEdge key={v.id} ... />)}
        {namespaces.map(ns => <NamespaceNode key={ns.id} ns={ns} ... />)}
      </Canvas>
    }
    terminalPane={showTerminal && <TerminalPane ... />}
    modals={<>
      {modal && <Modal ... />}
      {routeModal && <RouteModal ... />}
      {ifaceModal && <IfaceModal ... />}
      {vlanModal && <VlanModal ... />}
      {bridgeVlanModal && <BridgeVlanModal ... />}
      {iptablesModal && <IptablesModal ... />}
    </>}
  />
);
```

**注意**：旧レイアウトの JSX は全て消す。旧 `Btn` `Input` `Select` の呼び出しは、シェル内では使わない（Rail 風 inline style を直書き）。ただし**モーダル内では既存 `Btn` 等を残す**（Phase C で差し替え）。

---

### Step 8: 微調整 + 回帰確認（30分）

- Canvas の背景色だけ `TOKENS.bg` に揃える（既存 `COLORS.bg = #0a0e17` → Rail は `#0a0a0c`。`Canvas.jsx` の背景 rect の fill を `TOKENS.bg` 参照に変える、または `COLORS.bg` の値だけ `#0a0a0c` に上書き）
- スクリプトバー内に **グリッドドット色** が既存 `#1e293b` のままだと違和感が出る。`TOKENS.textFaint` 参照に変える
- `npm run lint` を通す
- 基準画像 `docs/rail-reference.png` と並べて見た目比較（フォント読み込みのため Google Fonts を index.html に追加）：

```html
<!-- index.html の <head> に追加 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 回帰チェックリスト（Step 8 後に実施）

**機能**
1. `npm run electron:dev` 起動 → 画面が出る
2. Docker 起動ボタンクリック → 右上チップが `Docker 接続中` 緑になる
3. File メニュー相当 → トポロジ読込 → `samples/ch01_vlan.json` → Canvas に 6 ns / 2 bridge / 5 veth が描画される（見た目は既存のまま）
4. LeftRail のスイッチセクションに `sw1` `sw2`、ホストに `pc1`〜`pc4`、VLAN に `VLAN 10` `VLAN 20`、リンクに 5 件が並ぶ
5. LeftRail で `sw1` クリック → Inspector に sw1 の情報（L2 スイッチ、BRIDGE br0、BRIDGE PORTS 一覧）が表示
6. Canvas 上の ns をクリック → Inspector が同期して切り替わる
7. Canvas 上の ns をドラッグ → 移動できる（既存通り）
8. ⌘K → パレット開く → ns 名で検索 → Enter で選択
9. トポロジを適用ボタン → 既存 Apply が走る
10. ターミナル（Inspector の `[シェル]` ボタン）→ 選択 ns でターミナルが開く
11. リロード → state 復元、選択状態も復元（`selected` は localStorage に保存しなくてよい、ns 座標だけ既存通り）
12. `BridgeVlanModal` / `IptablesModal` が開いて編集できる

**diff**
- `git diff --stat src/logic/ src/ipc/` → 0
- `git diff --stat src/ui/canvas/ src/ui/modals/ src/ui/terminal/ src/ui/primitives/` → 0
- `sessionStorage.getItem('netns-viz:gui-state:v1')` のキー構造が変わっていない

**見た目**
- `docs/rail-reference.png` と実画面を並べてスクショ比較。**Canvas の中身以外**は見分けがつかないこと。

---

## トラブル指針
- **中央 Canvas の位置がズレる** → RailShell の flex 構成を再確認。Canvas の親に `minWidth: 0` 必須（flex 縮退防止）
- **フォントが違う** → Google Fonts が読まれていない。`index.html` を確認
- **Inspector 内で `buildPortMap` 相当がうまく動かない** → `railView.links` から `l.a.nsId === selected || l.b.nsId === selected` でフィルタ → port/vid/flags に展開
- **トポロジ読込後に LeftRail が更新されない** → `buildRailView(state)` が `useMemo(..., [state])` 依存になっているか確認
- **判断に迷ったら**：保守的な方（触らない / 既存維持）を選ぶ。質問は拙者（管理者）に上げる

## 禁止事項再確認
- `src/logic/` `src/ipc/` を触る
- 既存 `src/ui/canvas/` `src/ui/modals/` `src/ui/terminal/` `src/ui/primitives/` のファイルを削除・編集する
- カスタムフック化・TypeScript 化・state 形の変更
- 新機能の追加（List/Table 実装、⌘K 実機能、Inspector インライン編集は全部禁止 → Phase B/C/D）
