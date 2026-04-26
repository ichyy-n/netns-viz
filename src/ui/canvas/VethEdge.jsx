import { COLORS } from "../../theme.js";

export const VethEdge = ({ v, pA, pB, cp1x, cp2x, setVethCtxMenu }) => {
  return (
                    <g onContextMenu={e => { e.preventDefault(); setVethCtxMenu({ vethId: v.id, x: e.clientX, y: e.clientY }); }}>
                      <path d={`M${pA.x},${pA.y} C${cp1x},${pA.y} ${cp2x},${pB.y} ${pB.x},${pB.y}`} stroke={COLORS.orange} strokeWidth={2} fill="none" strokeDasharray="6 4" opacity={0.6} />
                      <path d={`M${pA.x},${pA.y} C${cp1x},${pA.y} ${cp2x},${pB.y} ${pB.x},${pB.y}`} stroke="transparent" strokeWidth={12} fill="none" />
                      <circle cx={pA.x} cy={pA.y} r={4} fill={COLORS.orange} /><circle cx={pB.x} cy={pB.y} r={4} fill={COLORS.orange} />
                    </g>);
};
