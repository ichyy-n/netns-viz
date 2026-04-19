import { TOKENS, LABELS_JP } from "../../theme.js";
import { IconStroke, ICONS } from "./IconStroke.jsx";

const TAB_COMING_SOON = { list: true, table: true };

export function SecondaryToolbar({
  view = 'canvas',
  onViewChange,
  onAddNs,
  onAddBridge,
  onAddVeth,
  onAddVlan,
  onPaletteOpen,
  onSettings,
  dockerReady = true,
}) {
  const L = LABELS_JP;
  const TABS = [
    { k: 'canvas', label: L.canvas, icon: ICONS.grid },
    { k: 'list', label: L.list, icon: ICONS.list },
    { k: 'table', label: L.table, icon: ICONS.table },
  ];

  const handleTab = (k) => {
    if (TAB_COMING_SOON[k]) {
      alert(`${k} ビューは準備中でござる`);
      return;
    }
    onViewChange && onViewChange(k);
  };

  const addButtons = [
    { key: 'ns', icon: ICONS.plus, label: L.addNs, onClick: onAddNs,
      disabled: !onAddNs || !dockerReady },
    { key: 'bridge', icon: ICONS.bridge, label: L.addBridge, onClick: onAddBridge,
      disabled: !onAddBridge },
    { key: 'veth', icon: ICONS.link, label: L.addVeth, onClick: onAddVeth,
      disabled: !onAddVeth },
    { key: 'vlan', icon: ICONS.vlan, label: L.addVlan, onClick: onAddVlan,
      disabled: !onAddVlan },
  ];

  return (
    <div style={{ height: 38, borderBottom: `1px solid ${TOKENS.line}`,
      background: TOKENS.bg, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6, flexShrink: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center',
        background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 5, padding: 2 }}>
        {TABS.map(v => {
          const active = view === v.k;
          const soon = TAB_COMING_SOON[v.k];
          return (
            <button key={v.k} onClick={() => handleTab(v.k)}
              title={soon ? `${v.label}（Coming soon）` : v.label}
              style={{ height: 22, padding: '0 10px', fontSize: 11,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: active ? TOKENS.surfaceHi : 'transparent',
                color: active ? TOKENS.text : (soon ? TOKENS.textFaint : TOKENS.textDim),
                border: 'none', cursor: soon ? 'not-allowed' : 'pointer', borderRadius: 4,
                fontWeight: active ? 500 : 400, opacity: soon ? 0.55 : 1 }}>
              <IconStroke d={v.icon} size={11} color={active ? TOKENS.text : TOKENS.textDim} />
              {v.label}
            </button>
          );
        })}
      </div>
      <div style={{ width: 1, height: 16, background: TOKENS.line, margin: '0 4px' }} />

      {addButtons.map(b => (
        <button key={b.key} onClick={b.onClick} disabled={b.disabled} title={b.label}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 24, padding: '0 8px', fontSize: 11,
            color: b.disabled ? TOKENS.textFaint : TOKENS.textMid,
            background: 'transparent', border: '1px solid transparent', borderRadius: 4,
            cursor: b.disabled ? 'not-allowed' : 'pointer',
            opacity: b.disabled ? 0.55 : 1 }}
          onMouseEnter={e => { if (!b.disabled) e.currentTarget.style.background = TOKENS.surface; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <IconStroke d={b.icon} size={11} /> {b.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <button onClick={onPaletteOpen}
        style={{ display: 'flex', alignItems: 'center', gap: 6,
          height: 24, padding: '0 8px', background: TOKENS.surface,
          border: `1px solid ${TOKENS.line}`, borderRadius: 4, width: 260,
          color: TOKENS.textDim, fontSize: 11, cursor: 'pointer' }}>
        <IconStroke d={ICONS.search} size={11} />
        <span style={{ flex: 1, textAlign: 'left' }}>{L.searchShort}</span>
        <span style={{ fontFamily: TOKENS.fontMono, fontSize: 10, color: TOKENS.textFaint,
          border: `1px solid ${TOKENS.line}`, padding: '1px 4px', borderRadius: 3 }}>⌘K</span>
      </button>

      <button onClick={onSettings} title="Settings"
        style={{ height: 24, padding: '0 6px', color: TOKENS.textDim,
          background: 'transparent', border: 'none', cursor: onSettings ? 'pointer' : 'default' }}>
        <IconStroke d={ICONS.settings} size={13} />
      </button>
    </div>
  );
}
