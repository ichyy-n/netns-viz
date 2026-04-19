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
