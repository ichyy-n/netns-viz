import { COLORS, NS_W, NS_ITEM_H } from "../../theme.js";

export const BridgePort = ({ b, ns, y, dockerReady, toggleBridgeVlanFiltering, deleteBridge }) => {
  return (<g>
                            <rect x={ns.x+8} y={y+4} width={NS_W-16} height={NS_ITEM_H-6} rx={4} fill={COLORS.greenGlow} />
                            <text x={ns.x+20} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={11} fill={COLORS.green} fontFamily="'JetBrains Mono', monospace" fontWeight="600">🌉 {b.name}</text>
                            {b.ip && <text x={ns.x+NS_W-100} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">{b.ip}</text>}
                            {dockerReady && (
                              <g onClick={e => { e.stopPropagation(); toggleBridgeVlanFiltering(b.id); }} style={{ cursor: "pointer" }}>
                                <rect x={ns.x+NS_W-72} y={y+8} width={36} height={18} rx={9} fill={b.vlanFiltering ? COLORS.cyan+"40" : COLORS.border} />
                                <circle cx={b.vlanFiltering ? ns.x+NS_W-45 : ns.x+NS_W-63} cy={y+17} r={6} fill={b.vlanFiltering ? COLORS.cyan : COLORS.textDim} />
                                <text x={ns.x+NS_W-54} y={y+32} textAnchor="middle" fontSize={7} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">VLAN</text>
                              </g>
                            )}
                            <g onClick={e => { e.stopPropagation(); deleteBridge(b.id); }} style={{ cursor: "pointer" }}><text x={ns.x+NS_W-24} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={10} fill={COLORS.red} style={{ opacity: 0.5 }}>✕</text></g>
                          </g>);
};
