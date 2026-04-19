import { TOKENS } from '../../theme.js';

export default function CanvasDefs() {
  return (
    <defs>
      <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="14" cy="14" r="0.7" fill={TOKENS.textFaint} opacity="0.55" />
      </pattern>
      <radialGradient id="canvas-spot" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stopColor={TOKENS.indigo} stopOpacity="0.08" />
        <stop offset="100%" stopColor={TOKENS.indigo} stopOpacity="0" />
      </radialGradient>
      <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
        <feOffset dy="4" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.5" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
