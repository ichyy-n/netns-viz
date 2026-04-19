import { TOKENS } from '../../theme.js';

const NS_W = 200;
const NS_H_SWITCH = 110;
const NS_H_HOST = 94;

function vlanAccentOf(role, vlan) {
  if (role === 'switch') return TOKENS.magenta;
  if (vlan === 10) return TOKENS.vlan10;
  if (vlan === 20) return TOKENS.vlan20;
  return TOKENS.textMid;
}

function headerFillOf(role, vlan) {
  if (role === 'switch') return TOKENS.magentaSoft;
  if (vlan === 10) return TOKENS.vlan10Soft;
  if (vlan === 20) return TOKENS.vlan20Soft;
  return TOKENS.surfaceHi;
}

export default function NodeCard({
  ns,
  selected = false,
  dim = false,
  onClick,
  onMouseDown,
  onContextMenu,
}) {
  const role = ns.role || 'host';
  const h = role === 'switch' ? NS_H_SWITCH : NS_H_HOST;
  const x = ns.x ?? 0;
  const y = ns.y ?? 0;
  const accent = vlanAccentOf(role, ns.vlan);
  const headerFill = headerFillOf(role, ns.vlan);
  const opacity = dim ? 0.35 : 1;

  return (
    <g
      data-node={ns.id}
      transform={`translate(${x}, ${y})`}
      opacity={opacity}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
    >
      <rect
        x={0}
        y={3}
        width={NS_W}
        height={h}
        rx={10}
        fill="rgba(0,0,0,0.35)"
        opacity={0.5}
      />
      <rect
        x={0}
        y={0}
        width={NS_W}
        height={h}
        rx={10}
        fill={TOKENS.surface2}
        stroke={selected ? accent : TOKENS.line}
        strokeWidth={selected ? 1.5 : 1}
      />
      <rect x={0} y={0} width={NS_W} height={32} rx={10} fill={headerFill} />
      <rect x={0} y={22} width={NS_W} height={10} fill={headerFill} />
      <line x1={0} y1={32} x2={NS_W} y2={32} stroke={TOKENS.line} strokeWidth={0.5} />
      <circle cx={18} cy={16} r={9} fill={accent} fillOpacity={0.16} />
      <text
        x={34}
        y={20}
        fill={TOKENS.text}
        fontSize={13}
        fontWeight={600}
        fontFamily={TOKENS.fontMono}
      >
        {ns.name || ns.id}
      </text>
      <text
        x={NS_W - 10}
        y={20}
        textAnchor="end"
        fontSize={9.5}
        fill={accent}
        fontFamily={TOKENS.fontMono}
      >
        {role === 'switch' ? 'L2' : `VLAN ${ns.vlan ?? '-'}`}
      </text>
      <circle cx={NS_W - 14} cy={h - 12} r={3} fill={TOKENS.green} opacity={0.85} />
    </g>
  );
}
