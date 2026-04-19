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
  vids = null,
  pa = null,
  pb = null,
  dashed = false,
  highlighted = false,
  dim = false,
  strokeWidth,
}) {
  const stroke = pickStroke(kind, vid);
  const width = strokeWidth ?? (highlighted ? 2.5 : 1.6);
  const opacity = dim ? 0.3 : highlighted ? 1 : 0.85;
  const dasharray = dashed || kind === 'trunk' ? '5 4' : undefined;
  const showTrunkLabel = kind === 'trunk' && pa && pb;
  const trunkLabel = vids && vids.length > 0 ? `TRUNK ${vids.join(',')}` : 'TRUNK 10,20';
  const mx = showTrunkLabel ? (pa.x + pb.x) / 2 : 0;
  const my = showTrunkLabel ? (pa.y + pb.y) / 2 : 0;
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
      {pa && <circle cx={pa.x} cy={pa.y} r={3} fill={stroke} />}
      {pb && <circle cx={pb.x} cy={pb.y} r={3} fill={stroke} />}
      {showTrunkLabel && (
        <g transform={`translate(${mx}, ${my})`}>
          <rect
            x={-36}
            y={-10}
            width={72}
            height={20}
            rx={4}
            fill={TOKENS.bg}
            stroke={TOKENS.trunk}
            strokeWidth={0.75}
            strokeOpacity={0.5}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill={TOKENS.trunk}
            fontSize={9.5}
            fontWeight={600}
            fontFamily={TOKENS.fontMono}
            letterSpacing="0.1em"
          >
            {trunkLabel}
          </text>
        </g>
      )}
    </g>
  );
}
