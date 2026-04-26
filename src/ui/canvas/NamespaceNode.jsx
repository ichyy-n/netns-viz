import { NS_W, NS_W_SWITCH, NS_HEADER, NS_ITEM_H, TOKENS as T } from "../../theme.js";
import { getNsHeight } from "../../logic/topology.js";

const ROLE_COLOR = { switch: T.magenta, router: T.amber, host: T.sky };
const ROLE_SOFT  = { switch: T.magentaSoft, router: T.amberSoft, host: T.skySoft };

function inferRole(ns, bridges, ipForwardMap) {
  if (bridges.some(b => b.nsId === ns.id)) return 'switch';
  const ifCount = ns._ifCount ?? 0;
  if (ifCount >= 2 && ipForwardMap[ns.id]) return 'router';
  return 'host';
}

export const NamespaceNode = ({
  ns,
  selected,
  onMouseDown,
  setSelected,
  bridges,
  veths,
  vlans,
  ipForwardMap,
  deleteNs,
  // keep unused props in signature for compatibility
  dockerReady: _a, namespaces: _b, bridgeVlans, iptablesMap: _d,
  showVlanSubIface: _e, showMacTable: _f, showArpTable: _g, showRouteTable: _h,
  toggleIpForward: _i, showIptables: _j, openTerminal: _k,
  toggleBridgeVlanFiltering: _m, deleteBridge: _n, openIfaceModal: _o,
  openBridgeVlanModal: _p, openVlanModal: _q, deleteVeth: _r, deleteVlan: _s,
}) => {
  // Build items list: bridges with their member veths grouped underneath
  const items = [];
  const nsBr = bridges.filter(b => b.nsId === ns.id);
  const usedVethEnds = new Set();
  const usedVlanIds = new Set();
  nsBr.forEach(b => {
    let ports = 0;
    veths.forEach(v => {
      ['endA', 'endB'].forEach(end => {
        if (v[end].nsId === ns.id && v[end].bridge === b.id) ports++;
      });
    });
    const vlanCount = new Set((bridgeVlans || []).filter(bv => bv.bridgeId === b.id).map(bv => bv.vid)).size;
    items.push({ type: 'bridge', name: b.name, ip: b.ip || '', mac: '', vlanFiltering: b.vlanFiltering, ports, vlanCount });
    veths.forEach(v => {
      ['endA', 'endB'].forEach(end => {
        if (v[end].nsId === ns.id && v[end].bridge === b.id) {
          const vids = [...new Set((bridgeVlans || []).filter(bv => bv.bridgeId === b.id && bv.dev === v[end].name).map(bv => bv.vid))].sort((a, b) => a - b);
          items.push({ type: 'veth', name: v[end].name, ip: v[end].ip || '', mac: v[end].mac || '', bridged: true, vids });
          usedVethEnds.add(`${v.id}_${end}`);
        }
      });
    });
    // SVI (VLAN sub-interfaces on this bridge)
    const sviList = (vlans || []).filter(vl => vl.nsId === ns.id && (vl.parentIface === b.name || vl.name.startsWith(b.name + '.')));
    if (sviList.length > 0) {
      items.push({ type: 'svi-header', bridgeName: b.name, count: sviList.length });
      sviList.forEach(vl => {
        items.push({ type: 'svi', name: vl.name, ip: vl.ip || '', mac: '' });
        usedVlanIds.add(vl.id);
      });
    }
  });
  veths.forEach(v => {
    ['endA', 'endB'].forEach(end => {
      if (v[end].nsId === ns.id && !usedVethEnds.has(`${v.id}_${end}`)) {
        items.push({ type: 'veth', name: v[end].name, ip: v[end].ip || '', mac: v[end].mac || '' });
      }
    });
  });
  (vlans || []).filter(vl => vl.nsId === ns.id && !usedVlanIds.has(vl.id)).forEach(vl => {
    items.push({ type: 'vlan', name: vl.name, ip: vl.ip || '', mac: '' });
  });

  const role = inferRole({ ...ns, _ifCount: items.filter(i => i.type === 'veth').length }, bridges, ipForwardMap);
  const w = NS_W;
  const color = ROLE_COLOR[role] || T.sky;
  const soft = ROLE_SOFT[role] || T.skySoft;
  const h = getNsHeight(ns, bridges, veths, vlans);
  const isSel = selected === ns.id;

  return (
    <g onMouseDown={e => onMouseDown(e, ns.id)} onClick={e => { e.stopPropagation(); setSelected(ns.id); }} style={{ cursor: 'move' }}>
      {/* shadow */}
      <rect x={ns.x} y={ns.y + 3} width={w} height={h} rx={10}
        fill="rgba(0,0,0,0.35)" filter="blur(6px)" opacity={0.5} />
      {/* body */}
      <rect x={ns.x} y={ns.y} width={w} height={h} rx={10}
        fill={T.surface2} stroke={isSel ? color : T.line} strokeWidth={isSel ? 1.5 : 1} />
      {/* header bg (rounded top) */}
      <rect x={ns.x} y={ns.y} width={w} height={NS_HEADER} rx={10} fill={soft} />
      {/* header bg (flatten bottom) */}
      <rect x={ns.x} y={ns.y + NS_HEADER - 10} width={w} height={10} fill={soft} />
      <line x1={ns.x} y1={ns.y + NS_HEADER} x2={ns.x + w} y2={ns.y + NS_HEADER}
        stroke={T.line} strokeWidth={0.5} />
      {/* icon circle */}
      <circle cx={ns.x + 18} cy={ns.y + 16} r={9} fill={color + '28'} />
      <text x={ns.x + 18} y={ns.y + 20} textAnchor="middle"
        fill={color} fontSize={10} fontWeight={700} fontFamily={T.fontMono}>
        {role === 'switch' ? 'S' : role === 'router' ? 'R' : 'H'}
      </text>
      {/* name */}
      <text x={ns.x + 34} y={ns.y + 20} fill={T.text}
        fontSize={13} fontWeight={600} fontFamily={T.fontMono}>
        {ns.name}
      </text>
      {/* role tag */}
      <text x={ns.x + w - 12} y={ns.y + 20} textAnchor="end"
        fill={T.textDim} fontSize={9.5} fontFamily={T.fontMono} letterSpacing="0.1em">
        {role.toUpperCase()}
      </text>

      {/* interface rows */}
      {items.map((item, idx) => {
        const rowY = ns.y + NS_HEADER + idx * NS_ITEM_H;
        const indent = 0;
        return (
          <g key={(item.name || item.bridgeName) + idx}>
            {item.type === 'bridge' ? (<>
              {/* bridge: name · vlan_filtering N */}
              <text x={ns.x + 12} y={rowY + 14} fill={T.text}
                fontSize={11} fontFamily={T.fontMono} fontWeight={500}>
                {item.name}
                <tspan> · vlan_filtering {item.vlanFiltering ? '1' : '0'}</tspan>
              </text>
              {/* bridge: N ports · N VLANs */}
              <text x={ns.x + 12} y={rowY + 28} fill={T.textMid}
                fontSize={10.5} fontFamily={T.fontMono}>
                {item.ports} ports{item.vlanCount > 0 ? ` · ${item.vlanCount} VLANs` : ''}
              </text>
            </>) : item.type === 'svi-header' ? (<>
              {/* SVI section header */}
              <line x1={ns.x + 12} y1={rowY + NS_ITEM_H / 2}
                x2={ns.x + 12 + 4} y2={rowY + NS_ITEM_H / 2}
                stroke={T.textDim} strokeWidth={1} />
              <text x={ns.x + 20} y={rowY + NS_ITEM_H / 2 + 4}
                fill={T.textMid} fontSize={10.5} fontFamily={T.fontMono}>
                仮想IF · {item.count}
              </text>
              <line x1={ns.x + 90} y1={rowY + NS_ITEM_H / 2}
                x2={ns.x + w - 12} y2={rowY + NS_ITEM_H / 2}
                stroke={T.lineSoft} strokeWidth={1} />
            </>) : (<>
              {/* veth/vlan/svi frame */}
              <rect x={ns.x + 6 + indent} y={rowY + 3} width={w - 12 - indent} height={NS_ITEM_H - 6}
                rx={5} fill={T.surface} stroke={T.line} strokeWidth={1} />
              {/* state dot */}
              <circle cx={ns.x + 16 + indent} cy={rowY + 14} r={3}
                fill={item.type === 'svi' ? T.amber : item.type === 'vlan' ? T.indigo : color}
                opacity={0.85} />
              {/* name */}
              <text x={ns.x + 28 + indent} y={rowY + 14} fill={T.text}
                fontSize={11} fontFamily={T.fontMono} fontWeight={500}>
                {item.name}
              </text>
              {/* ip */}
              {item.ip && (
                <text x={ns.x + w - 14} y={rowY + 14} textAnchor="end"
                  fill={T.text} fontSize={11} fontFamily={T.fontMono} fontWeight={500}>
                  {item.ip}
                </text>
              )}
              {/* mac */}
              {item.mac && (
                <text x={ns.x + w - 14} y={rowY + 28} textAnchor="end" fill={T.textMid}
                  fontSize={10.5} fontFamily={T.fontMono}>
                  {item.mac}
                </text>
              )}
              {/* vlan/trunk badge */}
              {item.vids && item.vids.length > 1 && (
                <g>
                  <rect x={ns.x + 24} y={rowY + 20} width={40} height={13} rx={3}
                    fill="none" stroke={T.magenta} strokeWidth={1} opacity={0.6} />
                  <text x={ns.x + 28} y={rowY + 30} textAnchor="start"
                    fill={T.magenta} fontSize={8} fontFamily={T.fontMono} fontWeight={500}>
                    TRUNK
                  </text>
                </g>
              )}
              {item.vids && item.vids.length === 1 && (
                <g>
                  <rect x={ns.x + 24} y={rowY + 20} width={48} height={13} rx={3}
                    fill="none" stroke={T.sky} strokeWidth={1} opacity={0.6} />
                  <text x={ns.x + 28} y={rowY + 30} textAnchor="start"
                    fill={T.sky} fontSize={8} fontFamily={T.fontMono} fontWeight={500}>
                    VLAN {item.vids[0]}
                  </text>
                </g>
              )}
            </>)}
            {/* row separator */}
            {idx < items.length - 1 && (
              <line x1={ns.x + 10} y1={rowY + NS_ITEM_H}
                x2={ns.x + w - 10} y2={rowY + NS_ITEM_H}
                stroke={T.line} strokeWidth={1.5} />
            )}
          </g>
        );
      })}

    </g>
  );
};
