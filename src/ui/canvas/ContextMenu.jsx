import { useEffect, useRef } from 'react';
import { TOKENS } from '../../theme.js';

const MENU_MIN_W = 200;

function makeItems(selectedNs, onOpenInspector, onOpenShell, onClose) {
  const target = selectedNs;
  const log = (label) => () => {
    console.log('[ContextMenu]', label, target?.id ?? null);
    onClose?.();
  };
  const wrap = (fn) => () => {
    fn?.(target);
    onClose?.();
  };
  return [
    { label: 'インスペクタで開く', onClick: wrap(onOpenInspector), enabled: true },
    { label: 'シェルを起動', onClick: wrap(onOpenShell), enabled: true },
    { label: 'ping テスト', onClick: log('ping テスト'), enabled: false },
    { label: 'リンク追加', onClick: log('リンク追加'), enabled: false },
    { label: 'VLAN 設定', onClick: log('VLAN 設定'), enabled: false },
    { label: '削除', onClick: log('削除'), enabled: false },
  ];
}

export default function ContextMenu({
  x = 0,
  y = 0,
  visible = false,
  selectedNs = null,
  onOpenInspector,
  onOpenShell,
  onClose,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!visible) return undefined;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const items = makeItems(selectedNs, onOpenInspector, onOpenShell, onClose);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        top: y,
        left: x,
        minWidth: MENU_MIN_W,
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.line}`,
        borderRadius: 8,
        padding: 4,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        zIndex: 20,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it) => (
        <button
          type="button"
          key={it.label}
          onClick={it.onClick}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '6px 10px',
            background: 'transparent',
            color: it.enabled ? TOKENS.text : TOKENS.textDim,
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: TOKENS.fontSans,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = TOKENS.surfaceHi;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
