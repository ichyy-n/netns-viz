// IconStroke + ICONS
// 家老裁定 2026-04-19T15:48（解釈B）により、ICONS は JSX を含むため theme.js ではなく
// 本ファイルに同居させる。consumer は本ファイルから ICONS を import する。
// 原典: docs/netns-viz-rail.html L160〜198

export const IconStroke = ({ d, size = 14, color = 'currentColor', fill = 'none', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

// eslint-disable-next-line react-refresh/only-export-components
export const ICONS = {
  plus: 'M12 5v14M5 12h14',
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" />,
  chevR: 'm9 6 6 6-6 6',
  chevD: 'm6 9 6 6 6-6',
  play: 'M6 4 20 12 6 20Z',
  stop: 'M6 6h12v12H6z',
  terminal: <><path d="m5 7 4 5-4 5" /><path d="M13 17h6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="0.5" fill="currentColor" /><circle cx="4" cy="12" r="0.5" fill="currentColor" /><circle cx="4" cy="18" r="0.5" fill="currentColor" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 10h18M9 4v16" /></>,
  switch: <><rect x="3" y="8" width="18" height="9" rx="1.5" /><path d="M7 12h.01M11 12h.01M15 12h.01" /></>,
  host: <><rect x="4" y="4" width="16" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></>,
  bridge: <><path d="M3 10c0-2 2-4 4-4h10c2 0 4 2 4 4" /><path d="M3 10v6h18v-6" /><path d="M8 16v3M16 16v3" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></>,
  route: 'm5 9 4-4 4 4M9 5v9a4 4 0 0 0 4 4h2l4-4-4-4',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM7 3v5h8V3M7 21v-8h10v8',
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
  vlan: <><rect x="3" y="5" width="18" height="5" rx="1" /><rect x="3" y="14" width="18" height="5" rx="1" /></>,
  tag: <><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><circle cx="7" cy="7" r="1.2" fill="currentColor" /></>,
  command: 'M15 6a3 3 0 1 1 3 3h-3V6ZM9 6a3 3 0 1 0-3 3h3V6ZM9 18a3 3 0 1 1-3-3h3v3ZM15 18a3 3 0 1 0 3-3h-3v3ZM9 9h6v6H9z',
  filter: 'M3 4h18l-7 10v5l-4 2v-7Z',
  close: 'M6 6l12 12M18 6 6 18',
  dock: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 0v18',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  bolt: 'm13 2-8 12h7l-1 8 8-12h-7Z',
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  kebab: <><circle cx="12" cy="5" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="19" r="1.2" fill="currentColor" /></>,
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
};
