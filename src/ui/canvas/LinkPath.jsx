import { TOKENS as T } from '../../theme.js';
import { NS_W, HEADER_H, IF_ROW_H } from './NodeCard.jsx';

function portAnchor(ns, ifaceName) {
  const ifaces = ns.interfaces || [];
  const idx = Math.max(0, ifaces.findIndex((i) => i.name === ifaceName));
  const y = (ns.y ?? 0) + HEADER_H + idx * IF_ROW_H + IF_ROW_H / 2;
  const xL = ns.x ?? 0;
  const xR = xL + NS_W;
  return { xL, xR, y };
}

function linkEndpoints(link, nsById) {
  const nsA = nsById[link.a.ns];
  const nsB = nsById[link.b.ns];
  if (!nsA || !nsB) return null;
  const portA = link.a.iface ?? link.a.port;
  const portB = link.b.iface ?? link.b.port;
  const pa = portAnchor(nsA, portA);
  const pb = portAnchor(nsB, portB);
  const aIsLeft = (nsA.x ?? 0) + NS_W / 2 < (nsB.x ?? 0) + NS_W / 2;
  return {
    a: { x: aIsLeft ? pa.xR : pa.xL, y: pa.y },
    b: { x: aIsLeft ? pb.xL : pb.xR, y: pb.y },
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export { linkEndpoints };

export function LinkPath({ link, endpoints, hot = false, dim = false, onContextMenu }) {
  if (!endpoints) return null;
  const { a, b } = endpoints;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const d = horizontal
    ? `M${a.x},${a.y} C${a.x + dx * 0.5},${a.y} ${b.x - dx * 0.5},${b.y} ${b.x},${b.y}`
    : `M${a.x},${a.y} C${a.x},${a.y + dy * 0.5} ${b.x},${b.y - dy * 0.5} ${b.x},${b.y}`;
  const color = T.indigo;
  const opacity = dim ? 0.3 : hot ? 1 : 0.85;
  const strokeWidth = hot ? 2.2 : 1.5;
  return (
    <g
      opacity={opacity}
      onContextMenu={(e) => {
        if (!onContextMenu) return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, link);
      }}
    >
      <path d={d} stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray="5 4" strokeLinecap="round" />
      {/* invisible wider hit area for right-click */}
      <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
      <circle cx={a.x} cy={a.y} r={3} fill={color} />
      <circle cx={b.x} cy={b.y} r={3} fill={color} />
    </g>
  );
}
