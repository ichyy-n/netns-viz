import { useState, useMemo } from 'react';
import { TOKENS as T } from '../../theme.js';
import { NodeCard, NS_W } from './NodeCard.jsx';
import { LinkPath, linkEndpoints } from './LinkPath.jsx';
import { CanvasDefs } from './CanvasDefs.jsx';
import { BreadcrumbPill } from './BreadcrumbPill.jsx';
import { BottomChrome } from './BottomChrome.jsx';
import { ContextMenu } from './ContextMenu.jsx';

const LAYOUT_Y = { switch: 120, router: 240, host: 420 };
const X_GAP = NS_W + 60;
const COLLISION_X = NS_W + 40;
const EMPTY_ARRAY = [];

function computeAutoLayout(namespaces, links) {
  const placed = {};
  for (const ns of namespaces) {
    placed[ns.id] = {
      ...ns,
      _origX: ns.x,
      _origY: ns.y,
      y: ns.y ?? LAYOUT_Y[ns.role] ?? LAYOUT_Y.host,
      x: ns.x,
    };
  }

  const byRole = { switch: [], router: [], host: [] };
  for (const ns of namespaces) {
    const role = ns.role || 'host';
    (byRole[role] || byRole.host).push(placed[ns.id]);
  }

  const assignX = (list) => {
    let col = 0;
    for (const cur of list) {
      if (cur._origX != null) continue;
      const peerXs = links
        .filter((l) => l.a.ns === cur.id || l.b.ns === cur.id)
        .map((l) => (l.a.ns === cur.id ? l.b.ns : l.a.ns))
        .map((id) => placed[id])
        .filter((n) => n && n.x != null)
        .map((n) => n.x);
      if (peerXs.length) {
        cur.x = peerXs.reduce((s, v) => s + v, 0) / peerXs.length;
      } else {
        cur.x = 80 + col * X_GAP;
        col++;
      }
    }
    // collision resolution (push right)
    const sorted = [...list]
      .filter((n) => n.x != null)
      .sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (cur._origX != null && prev._origX != null) continue; // both fixed
      if (cur.x - prev.x < COLLISION_X) {
        cur.x = prev.x + COLLISION_X;
      }
    }
  };

  assignX(byRole.switch);
  assignX(byRole.router);
  assignX(byRole.host);

  return Object.values(placed);
}

function hasAccessModeIf(namespaces) {
  return (namespaces || []).some((n) =>
    (n.interfaces || []).some((i) => i.mode === 'access')
  );
}

function VlanTerritories({ namespaces }) {
  const byVlan = new Map();
  for (const ns of namespaces) {
    for (const iface of ns.interfaces || []) {
      if (iface.mode === 'access' && iface.vlan != null) {
        if (!byVlan.has(iface.vlan)) byVlan.set(iface.vlan, []);
        byVlan.get(iface.vlan).push(ns);
      }
    }
  }
  if (byVlan.size === 0) return null;
  const out = [];
  for (const [vid, nsArr] of byVlan) {
    if (!nsArr.length) continue;
    const xs = nsArr.map((n) => (n.x ?? 0) + NS_W / 2);
    const ys = nsArr.map((n) => (n.y ?? 0) + 40);
    const cx = xs.reduce((s, v) => s + v, 0) / xs.length;
    const cy = ys.reduce((s, v) => s + v, 0) / ys.length;
    const spread = Math.max(...xs) - Math.min(...xs);
    const rx = Math.max(spread / 2 + NS_W * 0.8, NS_W * 1.1);
    const ry = 120;
    const color = vid === 10 ? T.vlan10 : vid === 20 ? T.vlan20 : T.indigo;
    const soft = vid === 10 ? T.vlan10Soft : vid === 20 ? T.vlan20Soft : T.indigoSoft;
    out.push(
      <g key={vid} pointerEvents="none">
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
          fill={soft} stroke={color} strokeOpacity={0.4} strokeWidth={1} />
        <text x={cx} y={cy + ry + 16} textAnchor="middle"
          fill={color} fontSize={11} fontWeight={600} fontFamily={T.fontMono}>
          VLAN {vid}
        </text>
      </g>
    );
  }
  return <>{out}</>;
}

export function RailCanvas({
  railView,
  selectedId,
  onSelect,
  onMouseDown,
  svgRef,
  panning,
  onBgMouseDown,
  onWheel,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenNsTerminal,
  onContextMenuLink,
  emptyMessage,
}) {
  const [hoveredIface, setHoveredIface] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);

  const namespaces = railView?.namespaces ?? EMPTY_ARRAY;
  const links = railView?.links ?? EMPTY_ARRAY;

  const nsList = useMemo(
    () => computeAutoLayout(namespaces, links),
    [namespaces, links]
  );
  const nsById = useMemo(
    () => Object.fromEntries(nsList.map((n) => [n.id, n])),
    [nsList]
  );

  const endpointsByLink = useMemo(
    () => links.map((l) => ({ link: l, endpoints: linkEndpoints(l, nsById) })),
    [links, nsById]
  );

  const isNodeDim = (n) => {
    if (!selectedId || selectedId === n.id) return false;
    return !links.some(
      (l) =>
        (l.a.ns === selectedId && l.b.ns === n.id) ||
        (l.b.ns === selectedId && l.a.ns === n.id)
    );
  };

  const isLinkHot = (l) => {
    if (selectedId && (l.a.ns === selectedId || l.b.ns === selectedId)) return true;
    if (hoveredIface) {
      const sepIdx = hoveredIface.indexOf(':');
      const nsIdH = hoveredIface.slice(0, sepIdx);
      const ifaceH = hoveredIface.slice(sepIdx + 1);
      const aHit = l.a.ns === nsIdH && (l.a.iface === ifaceH || l.a.port === ifaceH);
      const bHit = l.b.ns === nsIdH && (l.b.iface === ifaceH || l.b.port === ifaceH);
      if (aHit || bHit) return true;
    }
    return false;
  };

  const isLinkDim = (l) => selectedId && !isLinkHot(l);

  const selectedNs = selectedId ? nsById[selectedId] : null;
  const showTerritory = hasAccessModeIf(nsList);

  const closeCtx = () => setCtxMenu(null);

  return (
    <div
      style={{ flex: 1, position: 'relative', background: T.bg, overflow: 'hidden', minWidth: 0 }}
      onClick={closeCtx}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ cursor: panning ? 'grabbing' : 'grab', userSelect: 'none', display: 'block' }}
        onMouseDown={onBgMouseDown}
        onWheel={onWheel}
      >
        <CanvasDefs />
        <rect width="100%" height="100%" fill={T.bg} />
        <rect width="100%" height="100%" fill="url(#rc-dot-grid)" />
        <rect width="100%" height="100%" fill="url(#rc-spot)" />

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {showTerritory && <VlanTerritories namespaces={nsList} />}

          {endpointsByLink.map(({ link, endpoints }) => (
            <LinkPath
              key={link.id}
              link={link}
              endpoints={endpoints}
              hot={isLinkHot(link)}
              dim={isLinkDim(link)}
              onContextMenu={onContextMenuLink}
            />
          ))}

          {nsList.map((ns) => (
            <NodeCard
              key={ns.id}
              ns={ns}
              selected={selectedId === ns.id}
              dim={isNodeDim(ns)}
              onMouseDown={onMouseDown}
              onSelect={onSelect}
              onContextMenu={(e, nsObj) =>
                setCtxMenu({ ns: nsObj, x: e.clientX, y: e.clientY })
              }
              hoveredIface={hoveredIface}
              onIfaceHover={setHoveredIface}
            />
          ))}

          {nsList.length === 0 && emptyMessage && (
            <text x={300} y={200} textAnchor="middle"
              fontSize={14} fill={T.textDim} fontFamily={T.fontMono}>
              {emptyMessage}
            </text>
          )}
        </g>
      </svg>

      {selectedNs && <BreadcrumbPill ns={selectedNs} />}

      <BottomChrome
        namespaces={nsList}
        links={links}
        zoom={zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomReset={onZoomReset}
      />

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={closeCtx}
          onOpenInspector={() => {
            onSelect?.(ctxMenu.ns.id);
            closeCtx();
          }}
          onOpenShell={
            onOpenNsTerminal
              ? () => {
                  onOpenNsTerminal(ctxMenu.ns);
                  closeCtx();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
