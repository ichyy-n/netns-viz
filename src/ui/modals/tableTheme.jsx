import { TOKENS as T } from "../../theme.js";

export const NAVY = {
  bg: '#0a0f1c',
  bg2: '#0e1424',
  surface: '#121a2c',
  surface2: '#1a2540',
  surfaceHi: '#243154',
  line: '#2a3656',
  lineSoft: '#1e2942',
  lineHi: '#3a4870',
  text: '#e6ebf5',
  textMid: '#a0acc4',
  textDim: '#6b7894',
  textFaint: '#475066',
  cyan: '#22d3ee',
  cyanSoft: 'rgba(34,211,238,0.14)',
};

export const tableModalStyles = {
  shellStyle: {
    background: NAVY.surface,
    border: `1px solid ${NAVY.lineHi}`,
    borderRadius: 10,
    boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 30px 80px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.5)',
  },
  headerStyle: {
    padding: '12px 14px 12px 16px',
    background: `linear-gradient(180deg, ${NAVY.surface2} 0%, ${NAVY.surface} 100%)`,
    borderBottom: `1px solid ${NAVY.lineHi}`,
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
  },
  bodyStyle: {
    padding: 18,
    background: NAVY.surface,
  },
};

export const TableTag = ({ children, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '2px 7px', fontSize: 10, fontFamily: T.fontMono, fontWeight: 600,
    letterSpacing: '0.05em', color: color || NAVY.textMid,
    background: color ? `${color}22` : NAVY.surfaceHi,
    border: `1px solid ${color ? `${color}40` : NAVY.line}`,
    borderRadius: 3,
  }}>
    {children}
  </span>
);

export const RefreshIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const NavyButton = ({ children, onClick, icon }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 28, padding: '0 12px', fontSize: 11.5, fontFamily: T.fontMono, fontWeight: 500,
    color: NAVY.textMid, background: 'transparent',
    border: `1px solid ${NAVY.line}`, borderRadius: 5, cursor: 'pointer',
  }}>
    {icon}
    {children}
  </button>
);

export const NavySegmentButton = ({ children, active, onClick }) => (
  <button onClick={onClick} style={{
    padding: '5px 10px', fontSize: 11, fontFamily: T.fontMono, fontWeight: 500,
    background: active ? NAVY.surfaceHi : 'transparent',
    color: active ? NAVY.text : NAVY.textMid,
    border: `1px solid ${active ? NAVY.lineHi : NAVY.line}`,
    borderRadius: 5,
    cursor: 'pointer',
  }}>
    {children}
  </button>
);

export const NavyDataTable = ({ columns, rows, emptyText, maxHeight = 320 }) => (
  <div style={{
    background: NAVY.bg,
    border: `1px solid ${NAVY.line}`,
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
  }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
      gap: 10,
      padding: '9px 12px',
      background: NAVY.bg2,
      borderBottom: `1px solid ${NAVY.line}`,
      color: NAVY.textDim,
      fontSize: 10,
      fontFamily: T.fontMono,
      fontWeight: 600,
      letterSpacing: '0.12em',
    }}>
      {columns.map(c => (
        <span key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</span>
      ))}
    </div>
    <div className="inspector-scroll" style={{ maxHeight, overflow: 'auto' }}>
      {rows.length === 0 ? (
        <div style={{ padding: '22px 14px', color: NAVY.textDim, fontSize: 11, fontFamily: T.fontMono, textAlign: 'center' }}>
          {emptyText}
        </div>
      ) : rows.map((row, i) => (
        <div key={row.id || i} style={{
          display: 'grid',
          gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
          gap: 10,
          alignItems: 'center',
          padding: '10px 12px',
          borderBottom: i < rows.length - 1 ? `1px solid ${NAVY.lineSoft}` : 'none',
          color: NAVY.text,
          fontSize: 12,
          fontFamily: T.fontMono,
        }}>
          {columns.map(c => (
            <span key={c.key} style={{
              minWidth: 0,
              textAlign: c.align || 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: c.muted ? NAVY.textMid : NAVY.text,
            }}>
              {c.render ? c.render(row[c.key], row) : (row[c.key] ?? <span style={{ color: NAVY.textFaint }}>-</span>)}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);
