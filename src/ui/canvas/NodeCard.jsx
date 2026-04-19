import { TOKENS } from '../../theme.js';
import { IconStroke, ICONS } from '../shell/IconStroke.jsx';

const NS_W = 200;
const NS_H_SWITCH = 110;
const NS_H_HOST = 94;

function vlanAccentOf(role, vlan) {
  if (role === 'switch') return TOKENS.magenta;
  if (vlan === 10) return TOKENS.vlan10;
  if (vlan === 20) return TOKENS.vlan20;
  return TOKENS.textMid;
}

function vlanSoftOf(vlan) {
  if (vlan === 10) return TOKENS.vlan10Soft;
  if (vlan === 20) return TOKENS.vlan20Soft;
  return TOKENS.surfaceHi;
}

function headerFillOf(role, vlan) {
  if (role === 'switch') return TOKENS.magentaSoft;
  if (vlan === 10) return TOKENS.vlan10Soft;
  if (vlan === 20) return TOKENS.vlan20Soft;
  return TOKENS.surfaceHi;
}

const PORT_PILLS = [
  { label: 'T', main: 'trunk', soft: 'trunkSoft' },
  { label: '10', main: 'vlan10', soft: 'vlan10Soft' },
  { label: '20', main: 'vlan20', soft: 'vlan20Soft' },
];

export default function NodeCard({
  ns,
  extras = null,
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
  const iconPath = role === 'switch' ? ICONS.switch : ICONS.host;

  const portCount = extras?.portCount ?? 3;
  const vlanCount = extras?.vlanCount ?? 2;
  const ip = extras?.ip ?? '';
  const vethName = extras?.vethName ?? '';

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
      <g transform="translate(10, 8)">
        <IconStroke d={iconPath} size={16} color={accent} />
      </g>
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

      {role === 'switch' ? (
        <>
          <text
            x={14}
            y={52}
            fill={TOKENS.textMid}
            fontSize={10.5}
            fontFamily={TOKENS.fontMono}
            letterSpacing="0.06em"
          >
            br0 · vlan_filtering 1
          </text>
          <text
            x={14}
            y={70}
            fill={TOKENS.textDim}
            fontSize={10}
            fontFamily={TOKENS.fontMono}
          >
            {`${portCount} ports · ${vlanCount} VLANs`}
          </text>
          <g transform="translate(14, 82)">
            {PORT_PILLS.map((p, i) => (
              <g key={p.label} transform={`translate(${i * 22}, 0)`}>
                <rect
                  width={18}
                  height={18}
                  rx={4}
                  fill={TOKENS[p.soft]}
                  stroke={TOKENS[p.main]}
                  strokeWidth={0.75}
                  strokeOpacity={0.5}
                />
                <text
                  x={9}
                  y={13}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill={TOKENS[p.main]}
                >
                  {p.label}
                </text>
              </g>
            ))}
          </g>
        </>
      ) : (
        <>
          <text
            x={14}
            y={52}
            fill={TOKENS.text}
            fontSize={11}
            fontFamily={TOKENS.fontMono}
          >
            {ip}
          </text>
          <text
            x={14}
            y={68}
            fill={TOKENS.textDim}
            fontSize={9.5}
            letterSpacing="0.06em"
          >
            {`veth-${vethName} · UP`}
          </text>
          <rect
            x={14}
            y={76}
            width={56}
            height={14}
            rx={3}
            fill={vlanSoftOf(ns.vlan)}
            stroke={accent}
            strokeOpacity={0.4}
            strokeWidth={0.75}
          />
          <text
            x={42}
            y={86}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            letterSpacing="0.08em"
            fill={accent}
          >
            {`VLAN ${ns.vlan ?? '-'}`}
          </text>
        </>
      )}
    </g>
  );
}
