import { TOKENS as T } from "../../theme.js";

export const DataTable = ({ columns, rows, emptyText = '(empty)', maxHeight = 320 }) => {
  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.line}`, borderRadius: 8,
      overflow: 'hidden', maxHeight, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
        padding: '10px 14px', borderBottom: `1px solid ${T.line}`,
        fontSize: 10, color: T.textDim, fontFamily: T.fontMono, fontWeight: 500,
        letterSpacing: '0.1em', flexShrink: 0,
      }}>
        {columns.map(c => (
          <span key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</span>
        ))}
      </div>
      <div style={{ overflow: 'auto' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '18px 14px', color: T.textDim, fontSize: 11, fontFamily: T.fontMono, textAlign: 'center' }}>
            {emptyText}
          </div>
        ) : rows.map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
            padding: '10px 14px', alignItems: 'center', gap: 8,
            borderBottom: i < rows.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
            fontSize: 12, fontFamily: T.fontMono, color: T.text,
          }}>
            {columns.map(c => (
              <span key={c.key} style={{ textAlign: c.align || 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.render ? c.render(row[c.key], row) : (row[c.key] ?? <span style={{ color: T.textFaint }}>—</span>)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Tag = ({ children, color }) => (
  <span style={{
    display: 'inline-block', padding: '3px 8px', fontSize: 10,
    fontFamily: T.fontMono, fontWeight: 500,
    background: color ? color + '20' : T.surface,
    color: color || T.textMid,
    border: color ? `1px solid ${color}40` : `1px solid ${T.line}`,
    borderRadius: 4,
  }}>{children}</span>
);
