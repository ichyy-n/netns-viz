import { TOKENS as T } from '../../theme.js';

const chromeBtn = {
  height: 22,
  width: 24,
  padding: '0 6px',
  border: 'none',
  background: 'transparent',
  color: T.textMid,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function BottomChrome({
  namespaces = [],
  links = [],
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}) {
  const routerCount = namespaces.filter((n) => n.role === 'router').length;
  const ifCount = namespaces.reduce((s, n) => s + (n.interfaces?.length || 0), 0);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 10px',
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 6,
          fontSize: 11,
          fontFamily: T.fontMono,
          color: T.textDim,
          pointerEvents: 'auto',
        }}
      >
        <span><span style={{ color: T.text }}>{namespaces.length}</span> ns</span>
        <span style={{ color: T.textFaint }}>·</span>
        <span><span style={{ color: T.text }}>{routerCount}</span> router</span>
        <span style={{ color: T.textFaint }}>·</span>
        <span><span style={{ color: T.text }}>{links.length}</span> link</span>
        <span style={{ color: T.textFaint }}>·</span>
        <span><span style={{ color: T.text }}>{ifCount}</span> IF</span>
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: 4,
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 6,
          pointerEvents: 'auto',
        }}
      >
        <button onClick={onZoomOut} style={chromeBtn} aria-label="zoom out">−</button>
        <button
          onClick={onZoomReset}
          style={{ ...chromeBtn, width: 46, fontSize: 11, fontFamily: T.fontMono }}
          aria-label="zoom reset"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={onZoomIn} style={chromeBtn} aria-label="zoom in">+</button>
      </div>
    </div>
  );
}
