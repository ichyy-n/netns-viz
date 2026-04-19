import { TOKENS } from '../../theme.js';

function pickStroke(kind, vid) {
  if (kind === 'trunk') return TOKENS.trunk;
  if (vid === 10) return TOKENS.vlan10;
  if (vid === 20) return TOKENS.vlan20;
  return TOKENS.textMid;
}

export default function LinkPath({
  d,
  kind,
  vid,
  dashed = false,
  highlighted = false,
  dim = false,
  strokeWidth,
}) {
  const stroke = pickStroke(kind, vid);
  const width = strokeWidth ?? (highlighted ? 2.5 : 1.6);
  const opacity = dim ? 0.3 : highlighted ? 1 : 0.85;
  const dasharray = dashed || kind === 'trunk' ? '5 4' : undefined;
  return (
    <g opacity={opacity} style={{ transition: 'opacity 0.15s' }}>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dasharray}
        strokeLinecap="round"
      />
    </g>
  );
}
