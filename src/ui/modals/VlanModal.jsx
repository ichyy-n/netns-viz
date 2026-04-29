import { TOKENS as T } from "../../theme.js";
import { AddModalShell, Field, TextInput, Separator, M } from "./addModalParts.jsx";

const CheckboxRow = ({ checked, onChange, label }) => (
  <label onClick={() => onChange(!checked)} style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', background: M.bg,
    border: `1px solid ${M.lineSoft}`, borderRadius: 6,
    cursor: 'pointer', marginBottom: 8,
  }}>
    <div style={{
      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
      background: checked ? M.cyan : 'transparent',
      border: `1.5px solid ${checked ? M.cyan : M.lineHi}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
    </div>
    <span style={{ fontSize: 12, color: M.textMid, fontFamily: T.fontMono }}>{label}</span>
  </label>
);

export const VlanModal = ({ vlanModal, setVlanModal, vlans, confirmVlan }) => {
  const existing = vlanModal.parentType === 'bridge'
    ? vlans.filter(vl => vl.parentId === vlanModal.parentId && vl.parentType === 'bridge')
    : vlans.filter(vl => vl.parentId === vlanModal.vethId && vl.parentEnd === vlanModal.end);

  return (
    <AddModalShell
      width={440}
      icon="◇" iconColor={T.amber} iconBg={T.amberSoft}
      title="仮想IF作成" subtitle={vlanModal.ifaceName}
      onCancel={() => setVlanModal(null)}
      onConfirm={confirmVlan}
    >
      <Field label="VLAN ID" hint="（1-4094）">
        <TextInput value={vlanModal.vlanId} onChange={v => setVlanModal({ ...vlanModal, vlanId: v })} placeholder="100" />
      </Field>
      <Field label="IP アドレス" hint="（任意）">
        <TextInput value={vlanModal.ip} onChange={v => setVlanModal({ ...vlanModal, ip: v })} placeholder="10.0.100.1/24" />
      </Field>

      {vlanModal.parentType !== 'bridge' && (
        <CheckboxRow
          checked={vlanModal.removeParentIp}
          onChange={v => setVlanModal({ ...vlanModal, removeParentIp: v })}
          label="親インターフェースの IP を削除"
        />
      )}

      {existing.length > 0 && (
        <>
          <Separator />
          <div style={{ fontSize: 11, color: M.textMid, fontFamily: T.fontMono, marginBottom: 8 }}>
            既存の VLAN
          </div>
          {existing.map(vl => (
            <div key={vl.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: M.bg, border: `1px solid ${M.lineSoft}`, borderRadius: 6, marginBottom: 4,
              fontSize: 12, fontFamily: T.fontMono,
            }}>
              <span style={{ color: T.amber }}>{vl.name}</span>
              {vl.ip && <span style={{ color: M.textDim }}>{vl.ip}</span>}
            </div>
          ))}
        </>
      )}
    </AddModalShell>
  );
};
