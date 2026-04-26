import { TOKENS as T } from "../../theme.js";

export const Canvas = ({ svgRef, panning, onMouseDown, onWheel, zoom, pan, children }) => {
  return (
            <svg ref={svgRef} width="100%" height="100%" style={{ cursor: panning ? "grabbing" : "grab", userSelect: 'none', display: 'block' }} onMouseDown={onMouseDown} onWheel={onWheel}>
              <rect width="100%" height="100%" fill={T.bg} />
              <defs><pattern id="grid" width={28} height={28} patternUnits="userSpaceOnUse"><circle cx={1} cy={1} r={0.7} fill={T.textFaint} opacity={0.55} /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {children}
              </g>
            </svg>
  );
};
