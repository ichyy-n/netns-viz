import { COLORS } from "../../theme.js";

export const Canvas = ({ svgRef, panning, onMouseDown, onWheel, zoom, pan, children }) => {
  return (
            <svg ref={svgRef} width="100%" height="100%" style={{ cursor: panning ? "grabbing" : "grab" }} onMouseDown={onMouseDown} onWheel={onWheel}>
              <rect width="100%" height="100%" fill={COLORS.bg} />
              <defs><pattern id="grid" width={40*zoom} height={40*zoom} patternUnits="userSpaceOnUse" x={pan.x%(40*zoom)} y={pan.y%(40*zoom)}><circle cx={1} cy={1} r={0.5} fill="#1e293b" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {children}
              </g>
            </svg>
  );
};
