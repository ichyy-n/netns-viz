import { TOKENS as T } from "../../theme.js";
import { AddModalShell, Field, TextInput, SelectInput, Separator, M } from "./addModalParts.jsx";

const ToggleRow = ({ title, description, checked, onChange }) => (
  <div onClick={() => onChange(!checked)} style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', background: M.bg,
    border: `1px solid ${M.lineSoft}`, borderRadius: 6,
    cursor: 'pointer', marginBottom: 8,
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: M.text, fontFamily: T.fontMono, fontWeight: 500, marginBottom: 2 }}>
        {title}
      </div>
      <div style={{ fontSize: 10.5, color: M.textDim, fontFamily: T.fontMono }}>
        {description}
      </div>
    </div>
    <div style={{
      width: 30, height: 18, borderRadius: 10, flexShrink: 0,
      background: checked ? M.cyan : M.surfaceHi,
      position: 'relative', transition: 'background 0.15s',
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: 7,
        background: '#fff',
        position: 'absolute', top: 2,
        left: checked ? 14 : 2,
        transition: 'left 0.15s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }} />
    </div>
  </div>
);

export const BridgeAddModal = ({ data, setData, onCancel, onConfirm, namespaces }) => {
  const nsOptions = (namespaces || []).map(n => ({ value: n.id, label: n.name }));

  return (
    <AddModalShell
      width={460}
      icon={
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="12" height="8" rx="2" stroke={T.magenta} strokeWidth="1.5" />
          <line x1="5" y1="7" x2="11" y2="7" stroke={T.magenta} strokeWidth="1.3" strokeLinecap="round" />
          <line x1="5" y1="9.5" x2="11" y2="9.5" stroke={T.magenta} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      } iconColor={T.magenta} iconBg={T.magentaSoft}
      title="ブリッジを追加" subtitle="ip link add type bridge"
      onCancel={onCancel} onConfirm={onConfirm}
    >
      <Field label="ブリッジ名">
        <TextInput value={data.name} onChange={v => setData({ ...data, name: v })} placeholder="br0" />
      </Field>
      <Field label="ネームスペース">
        <SelectInput value={data.nsId} onChange={v => setData({ ...data, nsId: v })} options={nsOptions} />
      </Field>
      <Field label="IP アドレス" hint="（任意）">
        <TextInput value={data.ip} onChange={v => setData({ ...data, ip: v })} placeholder="10.0.0.1/24" />
        <div style={{ fontSize: 10, color: M.textDim, fontFamily: T.fontMono, marginTop: 4 }}>
          ブリッジ自体に IP を割り当てる場合のみ
        </div>
      </Field>

      <Separator />

      <div style={{ fontSize: 10.5, color: M.text, fontFamily: T.fontMono, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        オプション
      </div>

      <ToggleRow
        title="VLAN filtering"
        description="ポート単位の VLAN タグ制御を有効化"
        checked={!!data.vlanFiltering}
        onChange={v => setData({ ...data, vlanFiltering: v })}
      />
    </AddModalShell>
  );
};
