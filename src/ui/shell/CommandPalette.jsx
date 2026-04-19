import React from "react";
import { TOKENS, LABELS_JP } from "../../theme.js";
import { IconStroke, ICONS } from "./IconStroke.jsx";

const vlanColor = (vid) => vid === 10 ? TOKENS.vlan10 : vid === 20 ? TOKENS.vlan20 : TOKENS.textMid;

export function CommandPalette({
  open,
  onClose,
  railView,
  onSelect,
  onViewChange,
  onAddNs,
  onAddBridge,
  onAddVeth,
  onAddVlan,
  onAddRoute,
  onAddCommand,
  onGenerateCommands,
  onOpenTerminal,
  onReset,
}) {
  const L = LABELS_JP;
  const [q, setQ] = React.useState('');
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setActiveIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  const nsItems = (railView?.namespaces || []).map(n => ({
    icon: n.role === 'switch' ? ICONS.switch : ICONS.host,
    label: n.name,
    hint: n.role === 'switch' ? 'L2 switch' : '',
    color: n.role === 'switch' ? TOKENS.magenta : vlanColor(n.vlan),
    run: () => { onSelect && onSelect(n.id); onViewChange && onViewChange('canvas'); },
  }));

  const allCommands = [
    { section: 'ノードへ移動', items: nsItems },
    { section: 'ビュー切替', items: [
      { icon: ICONS.grid, label: 'キャンバス表示', hint: '⌘1',
        run: () => onViewChange && onViewChange('canvas') },
      { icon: ICONS.list, label: 'リスト表示 (Coming soon)', hint: '⌘2', disabled: true },
      { icon: ICONS.table, label: 'テーブル表示 (Coming soon)', hint: '⌘3', disabled: true },
    ]},
    { section: 'アクション', items: [
      { icon: ICONS.plus, label: '名前空間を追加…', run: onAddNs, disabled: !onAddNs },
      { icon: ICONS.bridge, label: 'ブリッジを追加…', run: onAddBridge, disabled: !onAddBridge },
      { icon: ICONS.link, label: 'veth ペアを作成…', run: onAddVeth, disabled: !onAddVeth },
      { icon: ICONS.vlan, label: 'VLAN を設定…', run: onAddVlan, disabled: !onAddVlan },
      { icon: ICONS.plus, label: 'ルートを追加…', run: onAddRoute, disabled: !onAddRoute },
      { icon: ICONS.plus, label: 'コマンドを追加…', run: onAddCommand, disabled: !onAddCommand },
      { icon: ICONS.bolt, label: 'コマンドを生成', run: onGenerateCommands, disabled: !onGenerateCommands },
      { icon: ICONS.terminal, label: 'ホストターミナルを開く', hint: '⌃`',
        run: onOpenTerminal, disabled: !onOpenTerminal },
      { icon: ICONS.close, label: 'すべてリセット', run: onReset, disabled: !onReset },
    ]},
  ];

  const flat = allCommands.flatMap(s => s.items.map(i => ({ ...i, section: s.section })))
    .filter(i => !q || (i.label + ' ' + (i.hint || '')).toLowerCase().includes(q.toLowerCase()));

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === 'Escape') { onClose && onClose(); }
      else if (e.key === 'ArrowDown') {
        setActiveIdx(i => Math.min(flat.length - 1, i + 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setActiveIdx(i => Math.max(0, i - 1));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        const it = flat[activeIdx];
        if (it && !it.disabled && it.run) { it.run(); onClose && onClose(); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, activeIdx, flat, onClose]);

  if (!open) return null;

  let lastSection = null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh',
      backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560,
        background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 10,
        overflow: 'hidden', boxShadow: '0 25px 70px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${TOKENS.line}`,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconStroke d={ICONS.search} size={14} color={TOKENS.textDim} />
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); setActiveIdx(0); }}
            placeholder={L.search}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: TOKENS.text, fontSize: 14, fontFamily: TOKENS.fontSans }} />
          <span style={{ fontFamily: TOKENS.fontMono, fontSize: 10, color: TOKENS.textFaint,
            border: `1px solid ${TOKENS.line}`, padding: '1px 5px', borderRadius: 3 }}>ESC</span>
        </div>
        <div style={{ maxHeight: 440, overflow: 'auto', padding: 6 }}>
          {flat.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: TOKENS.textFaint, fontSize: 12 }}>
              一致するコマンドがありませぬ
            </div>
          )}
          {flat.map((it, i) => {
            const showSection = it.section !== lastSection;
            lastSection = it.section;
            const active = activeIdx === i;
            return (
              <React.Fragment key={i}>
                {showSection && (
                  <div style={{ padding: '10px 12px 4px', fontSize: 9.5, color: TOKENS.textDim,
                    fontFamily: TOKENS.fontMono, letterSpacing: '0.15em', fontWeight: 500 }}>
                    {it.section.toUpperCase()}
                  </div>
                )}
                <div onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => {
                    if (it.disabled || !it.run) return;
                    it.run();
                    onClose && onClose();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 6,
                    cursor: it.disabled ? 'not-allowed' : 'pointer',
                    opacity: it.disabled ? 0.45 : 1,
                    background: active ? TOKENS.surfaceHi : 'transparent' }}>
                  <IconStroke d={it.icon} size={13} color={it.color || TOKENS.textMid} />
                  <span style={{ flex: 1, fontSize: 13, color: TOKENS.text }}>{it.label}</span>
                  {it.hint && <span style={{ fontSize: 10.5, fontFamily: TOKENS.fontMono, color: TOKENS.textFaint }}>{it.hint}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${TOKENS.line}`,
          display: 'flex', alignItems: 'center', gap: 14, fontSize: 10.5, fontFamily: TOKENS.fontMono, color: TOKENS.textFaint }}>
          <span>↑↓ 選択</span>
          <span>↵ 実行</span>
          <div style={{ flex: 1 }} />
          <span>{flat.length} 件</span>
        </div>
      </div>
    </div>
  );
}
