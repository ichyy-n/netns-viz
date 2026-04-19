import { TOKENS } from '../../theme.js';

function pickStroke(vid) {
  if (vid === 10) return TOKENS.vlan10;
  if (vid === 20) return TOKENS.vlan20;
  return TOKENS.textFaint;
}

function pickFill(vid, color) {
  if (color) return color;
  if (vid === 10) return TOKENS.vlan10Soft;
  if (vid === 20) return TOKENS.vlan20Soft;
  return TOKENS.indigoSoft;
}

export default function VlanTerritory({ cx, cy, rx, ry, vid, color, cidr }) {
  const fill = pickFill(vid, color);
  const labelColor = pickStroke(vid);
  const labelText = cidr ? `VLAN ${vid} · ${cidr}` : `VLAN ${vid}`;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
      <text
        x={cx}
        y={cy + ry + 25}
        textAnchor="middle"
        fill={labelColor}
        fontSize={10}
        fontFamily={TOKENS.fontMono}
        letterSpacing="0.2em"
        opacity={0.7}
      >
        {labelText}
      </text>
    </g>
  );
}
