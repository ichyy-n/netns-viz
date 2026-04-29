import { TOKENS as T } from "../../theme.js";
import { AddModalShell, Field, TextInput, Separator, M } from "./addModalParts.jsx";

const Chip = ({ color, children }) => (
  <span style={{
    padding: '2px 6px', fontSize: 9.5, fontFamily: T.fontMono, fontWeight: 600,
    letterSpacing: '0.05em', color, background: color + '22', borderRadius: 3,
  }}>
    {children}
  </span>
);

const RadioGroup = ({ value, onChange, options }) => (
  <div style={{ display: 'flex', gap: 16 }}>
    {options.map(o => (
      <label key={o.value} onClick={() => onChange(o.value)} style={{
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontSize: 12, fontFamily: T.fontMono, fontWeight: 500,
        color: value === o.value ? M.cyan : M.textDim,
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: 8, flexShrink: 0,
          border: `2px solid ${value === o.value ? M.cyan : M.lineHi}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {value === o.value && <div style={{ width: 8, height: 8, borderRadius: 4, background: M.cyan }} />}
        </div>
        {o.label}
      </label>
    ))}
  </div>
);

const ToggleRow = ({ checked, onChange, label }) => (
  <label onClick={() => onChange(!checked)} style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: M.bg,
    border: `1px solid ${M.lineSoft}`, borderRadius: 6,
    cursor: 'pointer', marginBottom: 8,
  }}>
    <div style={{
      width: 30, height: 18, borderRadius: 10, flexShrink: 0,
      background: checked ? M.cyan : M.surfaceHi,
      position: 'relative', transition: 'background 0.15s',
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: 7, background: '#fff',
        position: 'absolute', top: 2, left: checked ? 14 : 2,
        transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }} />
    </div>
    <span style={{ fontSize: 11, color: M.textMid, fontFamily: T.fontMono }}>{label}</span>
  </label>
);

const CheckboxPair = ({ label1, checked1, onChange1, label2, checked2, onChange2 }) => (
  <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
    {[[label1, checked1, onChange1], [label2, checked2, onChange2]].map(([label, checked, onChange], i) => (
      <label key={i} onClick={() => onChange(!checked)} style={{
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontSize: 11, color: M.textMid, fontFamily: T.fontMono,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          background: checked ? M.cyan : 'transparent',
          border: `1.5px solid ${checked ? M.cyan : M.lineHi}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
        </div>
        {label}
      </label>
    ))}
  </div>
);

export const BridgeVlanModal = ({ bridgeVlanModal, setBridgeVlanModal, bridgeVlans, deleteBridgeVlan, applyPortMode }) => {
  const existing = bridgeVlans.filter(bv => bv.bridgeId === bridgeVlanModal.bridgeId && bv.dev === bridgeVlanModal.dev);
  const set = (k, v) => setBridgeVlanModal({ ...bridgeVlanModal, [k]: v });

  return (
    <AddModalShell
      width={520}
      icon={
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="12" height="8" rx="2" stroke={T.magenta} strokeWidth="1.5" />
          <line x1="5" y1="7" x2="11" y2="7" stroke={T.magenta} strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5" y1="9.5" x2="11" y2="9.5" stroke={T.magenta} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      }
      iconColor={T.magenta} iconBg={T.magentaSoft}
      title="VLAN 設定" subtitle={`${bridgeVlanModal.dev} (${bridgeVlanModal.bridgeName})`}
      onCancel={() => setBridgeVlanModal(null)}
      onConfirm={applyPortMode}
      confirmLabel="設定"
    >
      <Field label="ポートモード">
        <RadioGroup
          value={bridgeVlanModal.portMode}
          onChange={v => set('portMode', v)}
          options={[
            { value: 'access', label: 'Access' },
            { value: 'trunk', label: 'Trunk' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
      </Field>

      {bridgeVlanModal.portMode === 'access' && (
        <Field label="VLAN ID">
          <TextInput value={bridgeVlanModal.accessVid} onChange={v => set('accessVid', v)} placeholder="100" />
        </Field>
      )}

      {bridgeVlanModal.portMode === 'trunk' && (
        <>
          <Field label="VLAN IDs" hint="カンマ区切り">
            <TextInput value={bridgeVlanModal.trunkVids} onChange={v => set('trunkVids', v)} placeholder="10,20,30" />
          </Field>
          <Field label="ネイティブ VLAN" hint="（任意）">
            <TextInput value={bridgeVlanModal.trunkNativeVid} onChange={v => set('trunkNativeVid', v)} placeholder="10" />
          </Field>
          <ToggleRow checked={bridgeVlanModal.removeDefaultVlan} onChange={v => set('removeDefaultVlan', v)} label="デフォルト VLAN(1) を除去" />
          <ToggleRow checked={bridgeVlanModal.applySelf} onChange={v => set('applySelf', v)} label="ブリッジ自体 (self) にも設定" />
        </>
      )}

      {bridgeVlanModal.portMode === 'custom' && (
        <>
          <Field label="VID">
            <TextInput value={bridgeVlanModal.newVid} onChange={v => set('newVid', v)} placeholder="100" />
          </Field>
          <CheckboxPair
            label1="PVID" checked1={bridgeVlanModal.newPvid} onChange1={v => set('newPvid', v)}
            label2="Untagged" checked2={bridgeVlanModal.newUntagged} onChange2={v => set('newUntagged', v)}
          />
        </>
      )}

      {existing.length > 0 && (
        <>
          <Separator />
          <div style={{ fontSize: 10.5, fontFamily: T.fontMono, letterSpacing: '0.1em', textTransform: 'uppercase', color: M.textDim, fontWeight: 600, marginBottom: 8 }}>
            現在の設定
          </div>
          <div style={{ background: M.bg, border: `1px solid ${M.lineSoft}`, borderRadius: 6, overflow: 'hidden' }}>
            {existing.map((bv, i) => (
              <div key={bv.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                borderBottom: i < existing.length - 1 ? `1px solid ${M.lineSoft}` : 'none',
                fontSize: 11.5, fontFamily: T.fontMono,
              }}>
                <span style={{ color: M.text, fontWeight: 500, minWidth: 60 }}>VID {bv.vid}</span>
                {bv.pvid && <Chip color={M.cyan}>PVID</Chip>}
                {bv.untagged && <Chip color={T.green}>Untag</Chip>}
                {!bv.pvid && !bv.untagged && <Chip color={M.textDim}>TAGGED</Chip>}
                <span style={{ flex: 1 }} />
                <span onClick={() => deleteBridgeVlan(bv.id)} style={{ color: T.red, cursor: 'pointer', fontSize: 12, opacity: 0.7 }}>✕</span>
              </div>
            ))}
          </div>
        </>
      )}
    </AddModalShell>
  );
};
