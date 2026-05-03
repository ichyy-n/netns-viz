import { TOKENS as T } from '../../theme.js';
import { IconStroke, ICONS } from '../shell/IconStroke.jsx';
import { Chip } from '../shell/Chip.jsx';

const NS_W = 220;
const HEADER_H = 32;
const IF_ROW_H = 36;
const FOOTER_H = 10;

function nodeHeight(ns) {
  const n = ns?.interfaces?.length ?? 0;
  return HEADER_H + IF_ROW_H * n + FOOTER_H;
}

export { HEADER_H, IF_ROW_H, NS_W };

const COLOR = { switch: T.magenta, router: T.amber, host: T.sky };
const COLOR_SOFT = { switch: T.magentaSoft, router: T.amberSoft, host: T.skySoft };

// router は IconStroke の ICONS に未定義のためインライン定義（shell/ 非改変）
const ROUTER_ICON = (
  <>
    <path d="M4 14h16M9 14v-3l-2 2M11 14v-4M15 14l2-2M19 14v-4" />
    <rect x="4" y="14" width="16" height="5" rx="1.5" />
  </>
);

function iconFor(role) {
  if (role === 'switch') return ICONS.switch;
  if (role === 'host') return ICONS.host;
  return ROUTER_ICON;
}

export function NodeCard({
  ns,
  selected = false,
  dim = false,
  onMouseDown,
  onSelect,
  onContextMenu,
  hoveredIface,
  onIfaceHover,
}) {
  const role = ns.role || 'host';
  const color = COLOR[role] || T.sky;
  const soft = COLOR_SOFT[role] || T.skySoft;
  const h = nodeHeight(ns);
  const x = ns.x ?? 0;
  const y = ns.y ?? 0;
  const ifaces = ns.interfaces || [];

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: 'pointer', opacity: dim ? 0.35 : 1, transition: 'opacity .15s' }}
      onMouseDown={(e) => onMouseDown?.(e, ns)}
      onClick={(e) => { e.stopPropagation(); onSelect?.(ns.id); }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, ns);
      }}
    >
      {/* shadow */}
      <rect x={0} y={3} width={NS_W} height={h} rx={10}
        fill="rgba(0,0,0,0.35)" filter="url(#nc-blur6)" opacity={0.5} />
      {/* body */}
      <rect x={0} y={0} width={NS_W} height={h} rx={10}
        fill={T.surface2}
        stroke={selected ? color : T.line}
        strokeWidth={selected ? 1.5 : 1} />
      {/* header layer 1 (rounded top) */}
      <rect x={0} y={0} width={NS_W} height={HEADER_H} rx={10} fill={soft} />
      {/* header layer 2 (flatten bottom) */}
      <rect x={0} y={HEADER_H - 10} width={NS_W} height={10} fill={soft} />
      <line x1={0} y1={HEADER_H} x2={NS_W} y2={HEADER_H}
        stroke={T.line} strokeWidth={0.5} />
      {/* icon */}
      <circle cx={18} cy={16} r={9} fill={color + '28'} />
      <foreignObject x={10} y={8} width={16} height={16}
        style={{ color, pointerEvents: 'none' }}>
        <div xmlns="http://www.w3.org/1999/xhtml"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, color }}>
          <IconStroke d={iconFor(role)} size={14} />
        </div>
      </foreignObject>
      {/* name */}
      <text x={34} y={20} fill={T.text}
        fontSize={13} fontWeight={600} fontFamily={T.fontMono}>
        {ns.name}
      </text>
      {/* role tag */}
      <text x={NS_W - 10} y={20} textAnchor="end" fill={T.textDim}
        fontSize={9.5} fontFamily={T.fontMono} letterSpacing="0.1em">
        {role.toUpperCase()}
      </text>

      {/* IF rows */}
      {ifaces.map((iface, idx) => {
        const rowY = HEADER_H + idx * IF_ROW_H;
        const ifKey = `${ns.id}:${iface.name}`;
        const hover = hoveredIface === ifKey;
        const ips = iface.ips || [];
        const ipCount = ips.length;
        const nameLen = (iface.name || '').length;
        const chipX = 26 + nameLen * 6.5 + 8;
        return (
          <g key={iface.name || idx}
            onMouseEnter={() => onIfaceHover?.(ifKey)}
            onMouseLeave={() => onIfaceHover?.(null)}
          >
            {hover && (
              <rect x={4} y={rowY + 2} width={NS_W - 8} height={IF_ROW_H - 2}
                rx={5} fill={T.surfaceHi} opacity={0.6} />
            )}
            {/* state dot */}
            <circle cx={14} cy={rowY + 14} r={3}
              fill={iface.state === 'UP' ? T.green : T.red} />
            {/* name */}
            <text x={26} y={rowY + 16} fill={T.text}
              fontSize={11} fontFamily={T.fontMono} fontWeight={500}>
              {iface.name}
            </text>
            {/* state chip */}
            <foreignObject x={chipX} y={rowY + 3} width={46} height={14}>
              <div xmlns="http://www.w3.org/1999/xhtml">
                <Chip
                  color={iface.state === 'UP' ? T.green : T.red}
                  soft={iface.state === 'UP' ? T.greenSoft : T.redSoft}
                  size="sm">
                  {iface.state || 'UP'}
                </Chip>
              </div>
            </foreignObject>
            {/* ips[0] */}
            {ipCount > 0 && (
              <text
                x={NS_W - (ipCount >= 2 ? 34 : 12)}
                y={rowY + 16}
                textAnchor="end"
                fill={T.textMid}
                fontSize={10.5}
                fontFamily={T.fontMono}>
                {ips[0]}
              </text>
            )}
            {/* +N chip */}
            {ipCount >= 2 && (
              <g>
                <rect x={NS_W - 28} y={rowY + 7} width={22} height={12}
                  rx={3} fill={T.surfaceHi} />
                <text x={NS_W - 17} y={rowY + 16} textAnchor="middle"
                  fill={T.textDim} fontSize={9} fontFamily={T.fontMono}>
                  +{ipCount - 1}
                </text>
              </g>
            )}
            {/* MAC */}
            {iface.mac && (
              <text x={26} y={rowY + 29} fill={T.textDim}
                fontSize={9} fontFamily={T.fontMono} letterSpacing="0.02em">
                {iface.mac}
              </text>
            )}
            {/* row separator */}
            {idx < ifaces.length - 1 && (
              <line x1={10} y1={rowY + IF_ROW_H}
                x2={NS_W - 10} y2={rowY + IF_ROW_H}
                stroke={T.lineSoft} strokeWidth={0.5} />
            )}
          </g>
        );
      })}

      {/* footer status dot */}
      <circle cx={NS_W - 14} cy={h - 12} r={3} fill={T.green} opacity={0.85} />
    </g>
  );
}
