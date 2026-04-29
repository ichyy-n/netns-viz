import { useState, useRef, useEffect } from "react";
import { TOKENS as T } from "../../theme.js";

export const M = {
  bg: '#0a0f1c',
  surface: '#121a2c',
  surface2: '#1a2540',
  surfaceHi: '#243154',
  line: '#2a3656',
  lineSoft: '#1e2942',
  lineHi: '#3a4870',
  text: '#e6ebf5',
  textMid: '#a0acc4',
  textDim: '#6b7894',
  textFaint: '#475066',
  cyan: '#22d3ee',
  cyanSoft: 'rgba(34,211,238,0.14)',
  cyanHi: '#67e8f4',
};

export const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: M.textMid, fontFamily: T.fontMono }}>{label}</span>
      {hint && <span style={{ fontSize: 10, color: M.textDim, fontFamily: T.fontMono }}>{hint}</span>}
    </div>
    {children}
  </div>
);

export const TextInput = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{
      width: '100%', padding: '10px 12px', fontSize: 13,
      fontFamily: T.fontMono, color: M.text,
      background: M.bg, border: `1px solid ${M.line}`, borderRadius: 6,
      outline: 'none', boxSizing: 'border-box',
    }} />
);

export const SelectInput = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{
      width: '100%', padding: '10px 12px', fontSize: 13,
      fontFamily: T.fontMono, color: M.text,
      background: M.bg, border: `1px solid ${M.line}`, borderRadius: 6,
      outline: 'none', boxSizing: 'border-box', appearance: 'auto',
    }}>
    {options.map(o => <option key={o.value} value={o.value} style={{ background: M.surface, color: M.text }}>{o.label}</option>)}
  </select>
);

export const TextAreaInput = ({ value, onChange, placeholder, rows = 6 }) => (
  <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{
      width: '100%', padding: '10px 12px', fontSize: 13,
      fontFamily: T.fontMono, color: M.text,
      background: M.bg, border: `1px solid ${M.line}`, borderRadius: 6,
      outline: 'none', boxSizing: 'border-box', resize: 'vertical',
    }} />
);

export const Separator = () => (
  <div style={{ height: 1, background: M.line, margin: '20px 0' }} />
);

export const AddModalShell = ({ width = 520, icon, iconColor, iconBg, title, subtitle, onCancel, onConfirm, confirmLabel = "追加", confirmDisabled, children }) => {
  const [pos, setPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      <div ref={ref} style={{
        position: 'absolute', left: pos.x, top: pos.y, width, pointerEvents: 'auto',
        background: M.surface, border: `1px solid ${M.lineHi}`, borderRadius: 10,
        maxHeight: '85vh', overflow: 'hidden',
        boxShadow: `0 1px 0 rgba(255,255,255,0.08) inset, 0 0 0 1px rgba(255,255,255,0.03), 0 30px 80px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.5)`,
        display: 'flex', flexDirection: 'column',
      }}>
        <div onMouseDown={e => {
          const r = ref.current.getBoundingClientRect();
          setDragOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
          setDragging(true);
        }} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px 12px 16px',
          background: `linear-gradient(180deg, ${M.surface2} 0%, ${M.surface} 100%)`,
          borderBottom: `1px solid ${M.lineHi}`,
          boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
          cursor: 'grab', userSelect: 'none',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: iconBg, border: `1px solid ${iconColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {typeof icon === 'string'
              ? <span style={{ color: iconColor, fontSize: 13 }}>{icon}</span>
              : icon}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ color: M.text, fontWeight: 600, fontSize: 13, fontFamily: T.fontMono, flexShrink: 0 }}>
              {title}
            </span>
            <span style={{ color: M.textDim, fontSize: 11, fontFamily: T.fontMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </span>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: M.textDim, fontSize: 16, lineHeight: 1 }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 18px', flex: 1, overflow: 'auto', maxHeight: '70vh' }}>
          {children}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '10px 14px', borderTop: `1px solid ${M.line}`,
          background: M.bg,
        }}>
          <button onClick={onCancel} style={{
            padding: '6px 14px', fontSize: 11.5, fontFamily: T.fontMono, fontWeight: 500,
            background: 'transparent', color: M.textMid,
            border: `1px solid ${M.line}`, borderRadius: 5, cursor: 'pointer',
          }}>
            キャンセル
          </button>
          <button onClick={onConfirm} disabled={confirmDisabled} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', fontSize: 11.5, fontFamily: T.fontMono, fontWeight: 600,
            background: confirmDisabled ? M.surfaceHi : M.cyan, color: '#fff',
            border: 'none', borderRadius: 5, cursor: confirmDisabled ? 'default' : 'pointer',
            opacity: confirmDisabled ? 0.5 : 1,
            boxShadow: confirmDisabled ? 'none' : `0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 12px ${M.cyan}33`,
          }}>
            <span style={{ fontWeight: 700 }}>+</span>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
