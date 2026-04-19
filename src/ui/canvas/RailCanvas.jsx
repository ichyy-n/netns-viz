import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TOKENS } from '../../theme.js';
import CanvasDefs from './CanvasDefs.jsx';
import VlanTerritory from './VlanTerritory.jsx';
import NodeCard from './NodeCard.jsx';
import LinkPath from './LinkPath.jsx';
import { computeVlanTerritories, buildLinkGeometry } from '../../logic/rail-view.js';

const VIEWBOX_W = 1240;
const VIEWBOX_H = 720;
const DRAG_THRESHOLD = 2;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 0.9;

export default function RailCanvas({
  railView,
  selectedId = null,
  hoverId = null,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onZoomChange,
  onPanChange,
  onSelectNs,
  onDragEnd,
  onContextMenu,
}) {
  const svgRef = useRef(null);
  const panMovedRef = useRef(false);
  const [nodeDrag, setNodeDrag] = useState(null);
  const [panDrag, setPanDrag] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);

  const namespaces = useMemo(() => railView?.namespaces || [], [railView]);
  const links = useMemo(() => railView?.links || [], [railView]);
  const territories = useMemo(() => computeVlanTerritories(railView), [railView]);
  const geometry = useMemo(() => buildLinkGeometry(railView), [railView]);

  const toSvgPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg || typeof svg.createSVGPoint !== 'function') {
      return { x: clientX, y: clientY };
    }
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const inv = pt.matrixTransform(ctm.inverse());
    return { x: inv.x, y: inv.y };
  }, []);

  const isAdjacent = useCallback(
    (a, b) =>
      links.some(
        (l) =>
          (l.a.nsId === a && l.b.nsId === b) ||
          (l.b.nsId === a && l.a.nsId === b),
      ),
    [links],
  );

  const isNodeDim = (id) =>
    selectedId != null && selectedId !== id && !isAdjacent(selectedId, id);

  const isLinkHighlighted = (l) => {
    const focus = selectedId || hoverId;
    return focus != null && (l.a.nsId === focus || l.b.nsId === focus);
  };

  const isLinkDim = (l) =>
    selectedId != null &&
    l.a.nsId !== selectedId &&
    l.b.nsId !== selectedId;

  const handleNodeMouseDown = (e, ns) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = toSvgPoint(e.clientX, e.clientY);
    setNodeDrag({
      nsId: ns.id,
      startSvgX: p.x,
      startSvgY: p.y,
      origX: ns.x ?? 0,
      origY: ns.y ?? 0,
      zoomAtStart: zoom,
    });
    setDragPreview(null);
  };

  const handleNodeClick = (e, ns) => {
    e.stopPropagation();
    onSelectNs?.(ns.id);
  };

  const handleNodeContextMenu = (e, ns) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(ns, e.clientX, e.clientY);
  };

  const handleSvgMouseDown = (e) => {
    if (e.button !== 0) return;
    panMovedRef.current = false;
    setPanDrag({
      startClientX: e.clientX,
      startClientY: e.clientY,
      startSvgX: 0,
      startSvgY: 0,
      origPan: { x: pan.x, y: pan.y },
      captured: false,
    });
  };

  const handleSvgClick = () => {
    if (panMovedRef.current) {
      panMovedRef.current = false;
      return;
    }
    onSelectNs?.(null);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * factor));
      onZoomChange?.(next);
      return;
    }
    onPanChange?.({ x: pan.x - e.deltaX, y: pan.y - e.deltaY });
  };

  useEffect(() => {
    if (!nodeDrag && !panDrag) return undefined;

    const onMove = (ev) => {
      if (nodeDrag) {
        const p = toSvgPoint(ev.clientX, ev.clientY);
        const k = nodeDrag.zoomAtStart || 1;
        const dx = (p.x - nodeDrag.startSvgX) / k;
        const dy = (p.y - nodeDrag.startSvgY) / k;
        setDragPreview({
          nsId: nodeDrag.nsId,
          x: nodeDrag.origX + dx,
          y: nodeDrag.origY + dy,
        });
        return;
      }
      if (panDrag) {
        const dxClient = ev.clientX - panDrag.startClientX;
        const dyClient = ev.clientY - panDrag.startClientY;
        if (
          Math.abs(dxClient) > DRAG_THRESHOLD ||
          Math.abs(dyClient) > DRAG_THRESHOLD
        ) {
          panMovedRef.current = true;
        }
        const a = toSvgPoint(panDrag.startClientX, panDrag.startClientY);
        const b = toSvgPoint(ev.clientX, ev.clientY);
        onPanChange?.({
          x: panDrag.origPan.x + (b.x - a.x),
          y: panDrag.origPan.y + (b.y - a.y),
        });
      }
    };

    const onUp = (ev) => {
      if (nodeDrag) {
        const p = toSvgPoint(ev.clientX, ev.clientY);
        const k = nodeDrag.zoomAtStart || 1;
        const dx = (p.x - nodeDrag.startSvgX) / k;
        const dy = (p.y - nodeDrag.startSvgY) / k;
        const movedWorld =
          Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
        if (movedWorld) {
          onDragEnd?.(
            nodeDrag.nsId,
            nodeDrag.origX + dx,
            nodeDrag.origY + dy,
          );
        }
      }
      setNodeDrag(null);
      setPanDrag(null);
      setDragPreview(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [nodeDrag, panDrag, toSvgPoint, onDragEnd, onPanChange]);

  const getNsPos = (ns) => {
    if (dragPreview && dragPreview.nsId === ns.id) {
      return { x: dragPreview.x, y: dragPreview.y };
    }
    return { x: ns.x ?? 0, y: ns.y ?? 0 };
  };

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        background: TOKENS.bg,
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        style={{
          display: 'block',
          cursor: panDrag ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleSvgMouseDown}
        onClick={handleSvgClick}
        onWheel={handleWheel}
      >
        <CanvasDefs />
        <rect width={VIEWBOX_W} height={VIEWBOX_H} fill={TOKENS.bg} />
        <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#dot-grid)" />
        <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#canvas-spot)" />
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <g opacity={0.55}>
            {territories.map((t) => (
              <VlanTerritory
                key={`vt-${t.vid}`}
                vid={t.vid}
                cx={t.cx}
                cy={t.cy}
                rx={t.rx}
                ry={t.ry}
                cidr={t.cidr}
              />
            ))}
          </g>
          {geometry.map((g) => (
            <LinkPath
              key={g.id}
              d={g.d}
              kind={g.kind}
              vid={g.vid}
              highlighted={isLinkHighlighted(g)}
              dim={isLinkDim(g)}
            />
          ))}
          {namespaces.map((ns) => {
            const pos = getNsPos(ns);
            return (
              <NodeCard
                key={ns.id}
                ns={{ ...ns, x: pos.x, y: pos.y }}
                selected={selectedId === ns.id}
                dim={isNodeDim(ns.id)}
                onClick={(e) => handleNodeClick(e, ns)}
                onMouseDown={(e) => handleNodeMouseDown(e, ns)}
                onContextMenu={(e) => handleNodeContextMenu(e, ns)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
