export const COLORS = {
  bg: "#0a0e17", surface: "#111827", surfaceHover: "#1a2332",
  border: "#1e293b", text: "#e2e8f0", textMuted: "#64748b", textDim: "#b6bbc4ff",
  accent: "#3b82f6", green: "#10b981", greenGlow: "rgba(16,185,129,0.15)",
  orange: "#f59e0b", orangeGlow: "rgba(245,158,11,0.15)",
  red: "#ef4444", purple: "#a855f7", cyan: "#06b6d4",
  cyanGlow: "rgba(6,182,212,0.15)",
};

export const NS_COLORS = ["#3b82f6","#10b981","#f59e0b","#a855f7","#06b6d4","#ef4444","#ec4899","#84cc16"];

export const NS_W = 380;
export const NS_HEADER = 44;
export const NS_ITEM_H = 44;

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
