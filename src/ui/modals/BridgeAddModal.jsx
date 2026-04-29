import { useState, useRef, useEffect } from "react";
import { TOKENS as T } from "../../theme.js";

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: T.textMid, fontFamily: T.fontMono }}>{label}</span>
      {hint && <span style={{ fontSize: 10, color: T.textDim, fontFamily: T.fontMono }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{
      width: '100%', padding: '10px 12px', fontSize: 13,
      fontFamily: T.fontMono, color: T.text,
      background: T.bg, border: `1px solid ${T.line}`, borderRadius: 6,
      outline: 'none', boxSizing: 'border-box',
    }} />
);

const SelectInput = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{
      width: '100%', padding: '10px 12px', fontSize: 13,
      fontFamily: T.fontMono, color: T.text,
      background: T.bg, border: `1px solid ${T.line}`, borderRadius: 6,
      outline: 'none', boxSizing: 'border-box', appearance: 'auto',
    }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const ToggleRow = ({ title, description, checked, onChange }) => (
  <div onClick={() => onChange(!checked)} style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', background: T.surface,
    border: `1px solid ${T.line}`, borderRadius: 8,
    cursor: 'pointer', marginBottom: 8,
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: T.text, fontFamily: T.fontMono, fontWeight: 500, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: T.textDim, fontFamily: T.fontMono }}>
        {description}
      </div>
    </div>
    <div style={{
      width: 36, height: 20, borderRadius: 10, flexShrink: 0,
      background: checked ? T.indigo : T.surfaceHi,
      border: `1px solid ${checked ? T.indigo : T.line}`,
      position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 8,
        background: '#fff',
        position: 'absolute', top: 1,
        left: checked ? 18 : 1,
        transition: 'left 0.2s',
      }} />
    </div>
  </div>
);

export const BridgeAddModal = ({ data, setData, onCancel, onConfirm, namespaces }) => {
  const [pos, setPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const width = 520;

  useEffect(() => {
    if (pos.x === null) {
      setPos({
        x: Math.max(20, (window.innerWidth - width) / 2),
        y: Math.max(20, window.innerHeight * 0.1),
      });
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => setPos({
      x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x)),
      y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y)),
    });
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, dragOffset]);

  if (pos.x === null) return null;

  // Command preview / count
  const cmdCount = 2 // ip link add + ip link set up
    + (data.ip ? 1 : 0)
    + (data.vlanFiltering ? 1 : 0);

  const nsOptions = (namespaces || []).map(n => ({ value: n.id, label: n.name }));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      <div ref={ref} style={{
        position: 'absolute', left: pos.x, top: pos.y, width, pointerEvents: 'auto',
        background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 14,
        maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div onMouseDown={e => {
          const r = ref.current.getBoundingClientRect();
          setDragOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
          setDragging(true);
        }} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', borderBottom: `1px solid ${T.line}`,
          cursor: 'grab', userSelect: 'none',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: T.indigoSoft, border: `1px solid ${T.indigo}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: T.indigo, fontSize: 14 }}>▭</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{ color: T.text, fontWeight: 600, fontSize: 14, fontFamily: T.fontMono, flexShrink: 0 }}>
              ブリッジを追加
            </span>
            <span style={{ color: T.textDim, fontSize: 11, fontFamily: T.fontMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ip link add type bridge
            </span>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.textDim, fontSize: 18, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          <Field label="ブリッジ名">
            <TextInput value={data.name} onChange={v => setData({ ...data, name: v })} placeholder="br0" />
          </Field>
          <Field label="ネームスペース">
            <SelectInput value={data.nsId} onChange={v => setData({ ...data, nsId: v })} options={nsOptions} />
          </Field>
          <Field label="IP アドレス" hint="（任意）">
            <TextInput value={data.ip} onChange={v => setData({ ...data, ip: v })} placeholder="10.0.0.1/24" />
            <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.fontMono, marginTop: 6 }}>
              ブリッジ自体に IP を割り当てる場合のみ
            </div>
          </Field>

          <div style={{ height: 1, background: T.line, margin: '20px 0' }} />

          <div style={{ fontSize: 12, color: T.text, fontFamily: T.fontMono, fontWeight: 500, marginBottom: 12 }}>
            オプション
          </div>

          <ToggleRow
            title="VLAN filtering"
            description="ポート単位の VLAN タグ制御を有効化"
            checked={!!data.vlanFiltering}
            onChange={v => setData({ ...data, vlanFiltering: v })}
          />
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 20px', borderTop: `1px solid ${T.line}`,
          background: T.bg,
        }}>
          <span style={{ fontSize: 11, color: T.textDim, fontFamily: T.fontMono, flex: 1 }}>
            <span style={{ color: T.text, fontWeight: 600 }}>{cmdCount}</span> コマンドが実行されます
          </span>
          <button onClick={onCancel} style={{
            padding: '7px 16px', fontSize: 12, fontFamily: T.fontMono, fontWeight: 500,
            background: 'transparent', color: T.textMid,
            border: `1px solid ${T.line}`, borderRadius: 6, cursor: 'pointer',
          }}>
            キャンセル
          </button>
          <button onClick={onConfirm} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', fontSize: 12, fontFamily: T.fontMono, fontWeight: 600,
            background: T.indigo, color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
          }}>
            <span style={{ fontWeight: 700 }}>+</span>
            追加
          </button>
        </div>
      </div>
    </div>
  );
};
