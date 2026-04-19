import { COLORS, NS_W, NS_HEADER, NS_ITEM_H } from "../../theme.js";
import { getNsHeight } from "../../logic/topology.js";
import { BridgePort } from "./BridgePort.jsx";

export const NamespaceNode = ({
  ns,
  selected,
  onMouseDown,
  setSelected,
  dockerReady,
  bridges,
  veths,
  vlans,
  namespaces,
  bridgeVlans,
  ipForwardMap,
  iptablesMap,
  showVlanSubIface,
  showMacTable,
  showArpTable,
  showRouteTable,
  toggleIpForward,
  showIptables,
  openTerminal,
  deleteNs,
  toggleBridgeVlanFiltering,
  deleteBridge,
  openIfaceModal,
  openBridgeVlanModal,
  openVlanModal,
  deleteVeth,
  deleteVlan,
}) => {
  const h = getNsHeight(ns, bridges, veths, vlans);
  const isSel = selected === ns.id;
  return (
                    <g onMouseDown={e => onMouseDown(e, ns.id)} style={{ cursor: "move" }}>
                      <rect x={ns.x+3} y={ns.y+3} width={NS_W} height={h} rx={10} fill="rgba(0,0,0,0.3)" />
                      <rect x={ns.x} y={ns.y} width={NS_W} height={h} rx={10} fill={COLORS.surface} stroke={isSel ? ns.color : COLORS.border} strokeWidth={isSel ? 2 : 1} onClick={e => { e.stopPropagation(); setSelected(ns.id); }} />
                      <rect x={ns.x} y={ns.y} width={NS_W} height={NS_HEADER} rx={10} fill={ns.color+"18"} />
                      <rect x={ns.x} y={ns.y+NS_HEADER-1} width={NS_W} height={2} fill={ns.color+"30"} />
                      <circle cx={ns.x+18} cy={ns.y+NS_HEADER/2} r={5} fill={ns.color} />
                      <text x={ns.x+32} y={ns.y+NS_HEADER/2+1} dominantBaseline="middle" fontSize={13} fontWeight="700" fill={COLORS.text} fontFamily="'JetBrains Mono', monospace">{ns.name}</text>

                      {/* MT (MAC Table) button (bridge namespaces only) */}
                      {dockerReady && bridges.some(b => b.nsId === ns.id) && (
                        <g onClick={e => { e.stopPropagation(); showMacTable(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-244} y={ns.y+10} width={28} height={22} rx={4} fill={ns.color+"20"} />
                          <text x={ns.x+NS_W-230} y={ns.y+23} fontSize={9} fill={ns.color} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">MT</text>
                        </g>
                      )}

                      {/* AT (ARP Table) button */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); showArpTable(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-212} y={ns.y+10} width={28} height={22} rx={4} fill={ns.color+"20"} />
                          <text x={ns.x+NS_W-198} y={ns.y+23} fontSize={9} fill={ns.color} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">AT</text>
                        </g>
                      )}

                      {/* RT (Route Table) button */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); showRouteTable(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-180} y={ns.y+10} width={28} height={22} rx={4} fill={ns.color+"20"} />
                          <text x={ns.x+NS_W-166} y={ns.y+23} fontSize={10} fill={ns.color} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">RT</text>
                        </g>
                      )}

                      {/* ip_forward toggle (FWD) */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); toggleIpForward(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-148} y={ns.y+10} width={28} height={22} rx={4} fill={ipForwardMap[ns.id] ? (ns.color || COLORS.green)+"20" : COLORS.border} />
                          <text x={ns.x+NS_W-134} y={ns.y+23} fontSize={10} fill={ipForwardMap[ns.id] ? (ns.color || COLORS.green) : COLORS.textDim} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">FWD</text>
                        </g>
                      )}

                      {/* iptables button (IPT) */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); showIptables(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-116} y={ns.y+10} width={28} height={22} rx={4}
                            fill={(iptablesMap[ns.id]?.length) ? ns.color+"20" : COLORS.border} />
                          <text x={ns.x+NS_W-102} y={ns.y+23} fontSize={9} fill={(iptablesMap[ns.id]?.length) ? ns.color : COLORS.textDim}
                            fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">IPT</text>
                        </g>
                      )}

                      {/* Terminal button */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); openTerminal(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-84} y={ns.y+10} width={22} height={22} rx={4} fill={ns.color+"20"} />
                          <text x={ns.x+NS_W-73} y={ns.y+23} fontSize={11} fill={ns.color} fontFamily="'JetBrains Mono', monospace" textAnchor="middle">{">_"}</text>
                        </g>
                      )}

                      {/* Delete */}
                      <g onClick={e => { e.stopPropagation(); deleteNs(ns.id); }} style={{ cursor: "pointer" }}>
                        <rect x={ns.x+NS_W-32} y={ns.y+10} width={22} height={22} rx={4} fill="transparent" />
                        <line x1={ns.x+NS_W-25} y1={ns.y+17} x2={ns.x+NS_W-17} y2={ns.y+25} stroke={COLORS.textDim} strokeWidth={1.5} />
                        <line x1={ns.x+NS_W-17} y1={ns.y+17} x2={ns.x+NS_W-25} y2={ns.y+25} stroke={COLORS.textDim} strokeWidth={1.5} />
                      </g>

                      {/* Interfaces */}
                      {(() => {
                        let idx = 0; const items = [];
                        bridges.filter(b => b.nsId === ns.id).forEach(b => {
                          const y = ns.y + NS_HEADER + idx * NS_ITEM_H;
                          items.push(<BridgePort key={b.id} b={b} ns={ns} y={y} dockerReady={dockerReady} toggleBridgeVlanFiltering={toggleBridgeVlanFiltering} deleteBridge={deleteBridge} />); idx++;
                        });
                        veths.forEach(v => { ["endA","endB"].forEach(end => {
                          if (v[end].nsId === ns.id) {
                            const y = ns.y + NS_HEADER + idx * NS_ITEM_H;
                            const brName = v[end].bridge ? bridges.find(b => b.id === v[end].bridge)?.name : null;
                            items.push(<g key={v[end].id}>
                              <rect x={ns.x+8} y={y+4} width={NS_W-16} height={NS_ITEM_H-6} rx={4} fill={COLORS.orangeGlow}
                                onClick={e => { e.stopPropagation(); const nsObj = namespaces.find(n => n.id === v[end].nsId); if (dockerReady && nsObj) openIfaceModal(v.id, end, v[end].name, nsObj.name, v[end].ip, v[end].mac); }}
                                style={{ cursor: dockerReady ? "pointer" : "default" }} />
                              <text x={ns.x+20} y={y+16} dominantBaseline="middle" fontSize={11} fill={COLORS.orange} fontFamily="'JetBrains Mono', monospace" fontWeight="600"
                                onClick={e => { e.stopPropagation(); const nsObj = namespaces.find(n => n.id === v[end].nsId); if (dockerReady && nsObj) openIfaceModal(v.id, end, v[end].name, nsObj.name, v[end].ip, v[end].mac); }}
                                style={{ cursor: dockerReady ? "pointer" : "default" }}>🔗 {v[end].name}</text>
                              <text x={ns.x+NS_W-50} y={y+16} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace"
                                onClick={e => { e.stopPropagation(); const nsObj = namespaces.find(n => n.id === v[end].nsId); if (dockerReady && nsObj) openIfaceModal(v.id, end, v[end].name, nsObj.name, v[end].ip, v[end].mac); }}
                                style={{ cursor: dockerReady ? "pointer" : "default" }}>
                                {v[end].ip||""}{brName ? ` → ${brName}` : ""}
                              </text>
                              {v[end].mac && (
                                <text x={ns.x+NS_W-50} y={y+30} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace"
                                  onClick={e => { e.stopPropagation(); const nsObj = namespaces.find(n => n.id === v[end].nsId); if (dockerReady && nsObj) openIfaceModal(v.id, end, v[end].name, nsObj.name, v[end].ip, v[end].mac); }}
                                  style={{ cursor: dockerReady ? "pointer" : "default" }}>
                                  {v[end].mac}
                                </text>
                              )}
                              {/* VL button - bridge VLAN config */}
                              {dockerReady && v[end].bridge && (() => {
                                const br = bridges.find(bb => bb.id === v[end].bridge);
                                if (!br || !br.vlanFiltering) return null;
                                return (
                                  <g onClick={e => { e.stopPropagation(); openBridgeVlanModal(br.id, br.name, v[end].name, 'port', v.id, end, v[end].nsId); }} style={{ cursor: "pointer" }}>
                                    <rect x={ns.x+42} y={y+24} width={20} height={14} rx={3} fill={COLORS.cyan+"30"} />
                                    <text x={ns.x+52} y={y+33} textAnchor="middle" fontSize={8} fill={COLORS.cyan} fontFamily="'JetBrains Mono', monospace" fontWeight="700">VL</text>
                                  </g>
                                );
                              })()}
                              {/* Port mode display A:/T: */}
                              {v[end].bridge && (() => {
                                const bvs = bridgeVlans.filter(bv => bv.vethId === v.id && bv.vethEnd === end);
                                if (!bvs.length) return null;
                                const isAccess = bvs.length === 1 && bvs[0].pvid && bvs[0].untagged;
                                return (
                                  <text x={ns.x+68} y={y+33} fontSize={8} fill={COLORS.cyan} fontFamily="'JetBrains Mono', monospace">
                                    {isAccess ? `A:${bvs[0].vid}` : `T:${bvs.map(b=>b.vid).join(',')}`}
                                  </text>
                                );
                              })()}
                              {/* V button - endpoint VLAN sub-interface */}
                              {dockerReady && !v[end].bridge && showVlanSubIface && (
                                <g onClick={e => { e.stopPropagation(); openVlanModal(v.id, end, v[end].name, v[end].nsId); }} style={{ cursor: "pointer" }}>
                                  <rect x={ns.x+42} y={y+24} width={14} height={14} rx={3} fill={COLORS.orange+"30"} />
                                  <text x={ns.x+49} y={y+33} textAnchor="middle" fontSize={8} fill={COLORS.orange} fontFamily="'JetBrains Mono', monospace" fontWeight="700">V</text>
                                </g>
                              )}
                              <g onClick={e => { e.stopPropagation(); deleteVeth(v.id); }} style={{ cursor: "pointer" }}><text x={ns.x+NS_W-24} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={10} fill={COLORS.red} style={{ opacity: 0.5 }}>✕</text></g>
                            </g>); idx++;
                          }
                        }); });
                        vlans.filter(vl => vl.nsId === ns.id).forEach(vl => {
                          const y = ns.y + NS_HEADER + idx * NS_ITEM_H;
                          items.push(<g key={vl.id}>
                            <rect x={ns.x+8} y={y+4} width={NS_W-16} height={NS_ITEM_H-6} rx={4} fill={COLORS.cyanGlow} />
                            <text x={ns.x+20} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={11} fill={COLORS.cyan} fontFamily="'JetBrains Mono', monospace" fontWeight="600">🏷 {vl.name}</text>
                            {vl.ip && <text x={ns.x+NS_W-50} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">{vl.ip}</text>}
                            <g onClick={e => { e.stopPropagation(); deleteVlan(vl.id); }} style={{ cursor: "pointer" }}><text x={ns.x+NS_W-24} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={10} fill={COLORS.red} style={{ opacity: 0.5 }}>✕</text></g>
                          </g>); idx++;
                        });
                        return items;
                      })()}
                    </g>);
};
