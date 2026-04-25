import { TOKENS as T } from '../../theme.js';

// Phase B: 「インスペクタで開く」「シェルを起動」のみ稼働。他は Phase C で接続予定の placeholder。
export function ContextMenu({
  x,
  y,
  onClose,
  onOpenInspector,
  onOpenShell,
}) {
  const items = [
    { label: 'インスペクタで開く', handler: onOpenInspector, enabled: !!onOpenInspector },
    { label: 'シェルを起動', handler: onOpenShell, enabled: !!onOpenShell },
    { label: 'プロパティを編集', handler: null, enabled: false },
    { label: 'IF を追加', handler: null, enabled: false },
    { label: 'ルートを追加', handler: null, enabled: false },
    { label: '削除', handler: null, enabled: false },
  ];
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 6,
        padding: 4,
        zIndex: 9999,
        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        minWidth: 180,
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          onClick={() => {
            if (it.enabled && it.handler) it.handler();
            onClose?.();
          }}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: T.fontMono,
            color: it.enabled ? T.text : T.textFaint,
            cursor: it.enabled ? 'pointer' : 'not-allowed',
            borderRadius: 4,
          }}
          onMouseEnter={(e) => {
            if (it.enabled) e.currentTarget.style.background = T.surfaceHi;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {it.label}
        </div>
      ))}
    </div>
  );
}
