import { TOKENS } from '../../theme.js';

const btnStyle = {
  padding: '4px 10px',
  background: TOKENS.surface,
  color: TOKENS.textMid,
  border: `1px solid ${TOKENS.line}`,
  borderRadius: 6,
  fontSize: 11,
  fontFamily: TOKENS.fontMono,
  cursor: 'pointer',
};

export default function BottomChrome({ zoom = 1, onReset, onZoomIn, onZoomOut }) {
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
        onClick={onZoomOut}
        title="ズームアウト"
        aria-label="ズームアウト"
        style={{ ...btnStyle, minWidth: 28 }}
      >
        −
      </button>
      <button
        type="button"
        onClick={onReset}
        title="ズームをリセット"
        style={{ ...btnStyle, minWidth: 56 }}
      >
        {pct}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        title="ズームイン"
        aria-label="ズームイン"
        style={{ ...btnStyle, minWidth: 28 }}
      >
        ＋
      </button>
    </div>
  );
}
