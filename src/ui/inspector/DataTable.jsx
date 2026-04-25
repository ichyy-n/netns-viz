import { useState } from 'react';
import { TOKENS } from '../../theme.js';

export function DataTable({ columns, rows }) {
  const template = `repeat(${columns.length}, 1fr)`;
  const empty = !rows || rows.length === 0;

  return (
    <div style={{ border: `1px solid ${TOKENS.line}`, borderRadius: 6,
      overflow: 'hidden', background: TOKENS.bg2 }}>
      <div style={{ display: 'grid', gridTemplateColumns: template, padding: '8px 10px',
        fontSize: 9.5, color: TOKENS.textDim, fontFamily: TOKENS.fontMono,
        letterSpacing: '0.12em', fontWeight: 500, background: TOKENS.surface,
        borderBottom: `1px solid ${TOKENS.line}`, textTransform: 'uppercase' }}>
        {columns.map((c) => <span key={c}>{c}</span>)}
      </div>
      {empty ? (
        <div style={{ padding: '16px 10px', textAlign: 'center', color: TOKENS.textDim,
          fontSize: 11, fontFamily: TOKENS.fontMono }}>
          （データなし）
        </div>
      ) : (
        rows.map((row, i) => (
          <DataRow key={i} template={template} columns={columns} row={row}
            last={i === rows.length - 1} />
        ))
      )}
    </div>
  );
}

function DataRow({ template, columns, row, last }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: template, alignItems: 'center',
        padding: '0 10px', minHeight: 34, fontSize: 11.5, fontFamily: TOKENS.fontMono,
        color: TOKENS.text, background: hover ? TOKENS.lineSoft : 'transparent',
        borderBottom: last ? 'none' : `1px solid ${TOKENS.lineSoft}` }}>
      {columns.map((c) => {
        const v = row[c];
        const isNull = v == null;
        return (
          <span key={c} style={{ color: isNull ? TOKENS.textFaint : TOKENS.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isNull ? '—' : String(v)}
          </span>
        );
      })}
    </div>
  );
}
