import { TOKENS, LABELS_JP } from "../../theme.js";
import { IconStroke, ICONS } from "./IconStroke.jsx";
import { Chip } from "./Chip.jsx";

// execLog entry shape (from App.jsx): { time, cmd, output, success }
// Rail CommandLog expects: { ok, t, cmd }
export function CommandLog({ open, onToggle, execLog = [] }) {
  const L = LABELS_JP;
  const tail = execLog.slice(-20);
  const okCount = tail.filter(e => e.success).length;
  return (
    <div style={{ borderTop: `1px solid ${TOKENS.line}`, background: TOKENS.surface,
      maxHeight: open ? 200 : 32, transition: 'max-height .2s', overflow: 'hidden', flexShrink: 0 }}>
      <div onClick={() => onToggle && onToggle(!open)} style={{
        height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6,
        cursor: 'pointer', userSelect: 'none', fontSize: 10, fontFamily: TOKENS.fontMono,
        color: TOKENS.textDim, letterSpacing: '0.15em', fontWeight: 500 }}>
        <IconStroke d={ICONS.chevD} size={8} color={TOKENS.textDim}
          style={{ transform: open ? 'none' : 'rotate(-90deg)' }} />
        <span style={{ flex: 1 }}>{L.cmdLog.toUpperCase()}</span>
        {tail.length > 0 && (
          <Chip color={TOKENS.green} soft={TOKENS.greenSoft}>{okCount} OK</Chip>
        )}
      </div>
      <div style={{ padding: '4px 12px 10px', fontSize: 10.5, fontFamily: TOKENS.fontMono,
        color: TOKENS.textDim, lineHeight: 1.7, maxHeight: 168, overflow: 'auto' }}>
        {tail.length === 0 && (
          <div style={{ color: TOKENS.textFaint, fontSize: 10.5 }}>
            GUI の操作ログがここに表示されます
          </div>
        )}
        {tail.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: e.success ? TOKENS.green : TOKENS.red, width: 10 }}>
              {e.success ? '✓' : '✗'}
            </span>
            <span style={{ color: TOKENS.textFaint, width: 68 }}>{e.time}</span>
            <span style={{ color: TOKENS.text, flex: 1, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.cmd}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
