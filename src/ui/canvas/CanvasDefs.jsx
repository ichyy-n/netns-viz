import { TOKENS as T } from '../../theme.js';

export function CanvasDefs() {
  return (
    <defs>
      <filter id="nc-blur6" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
      </filter>
      <pattern id="rc-dot-grid" width={28} height={28} patternUnits="userSpaceOnUse">
        <circle cx={1} cy={1} r={0.7} fill={T.textFaint} opacity={0.55} />
      </pattern>
      <radialGradient id="rc-spot" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stopColor={T.indigo} stopOpacity={0.08} />
        <stop offset="100%" stopColor={T.indigo} stopOpacity={0} />
      </radialGradient>
    </defs>
  );
}
