import { TOKENS } from '../../theme.js';

export default function BottomChrome({ zoom = 1, onReset }) {
  const pct = Math.round(zoom * 100);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        right: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        zIndex: 10,
      }}
    >
      <button
        type="button"
        onClick={onReset}
        title="ズームをリセット"
        style={{
          padding: '4px 10px',
          background: TOKENS.surface,
          color: TOKENS.textMid,
          border: `1px solid ${TOKENS.line}`,
          borderRadius: 6,
          fontSize: 11,
          fontFamily: TOKENS.fontMono,
          cursor: 'pointer',
          minWidth: 56,
        }}
      >
        {pct}%
      </button>
    </div>
  );
}
