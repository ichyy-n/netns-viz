import { TOKENS as T } from "../../theme.js";
import { AddModalShell, Field, TextInput, SelectInput, Separator, M } from "./addModalParts.jsx";

const ROLE_COLOR = { switch: T.magenta, router: T.amber, host: T.sky };

const RoleBadge = ({ role }) => {
  if (!role) return null;
  const color = ROLE_COLOR[role] || T.sky;
  return (
    <span style={{
      padding: '2px 6px', fontSize: 9.5, fontFamily: T.fontMono, fontWeight: 600,
      letterSpacing: '0.05em', color, background: color + '22', borderRadius: 3,
    }}>
      {role.toUpperCase()}
    </span>
  );
};

const SectionHeader = ({ label, accent, role }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
    <div style={{
      fontSize: 10.5, fontFamily: T.fontMono, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: accent, fontWeight: 700,
    }}>
      {label}
    </div>
    <div style={{ flex: 1, height: 1, background: M.line }} />
    <RoleBadge role={role} />
  </div>
);

const EndSection = ({ label, prefix, data, setData, nsOptions, bridgeOptions, accent, role }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: 0,
    padding: '14px 14px 4px',
    background: M.bg,
    border: `1px solid ${M.lineSoft}`,
    borderLeft: `2px solid ${accent}`,
    borderRadius: 6,
  }}>
    <SectionHeader label={label} accent={accent} role={role} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Field label="インターフェース名">
        <TextInput value={data[`${prefix}Name`]} onChange={v => setData({ ...data, [`${prefix}Name`]: v })} placeholder="veth1a" />
      </Field>
      <Field label="ネームスペース">
        <SelectInput value={data[`${prefix}Ns`]} onChange={v => setData({ ...data, [`${prefix}Ns`]: v })} options={nsOptions} />
      </Field>
      <Field label="IP アドレス" hint="（任意）">
        <TextInput value={data[`${prefix}Ip`]} onChange={v => setData({ ...data, [`${prefix}Ip`]: v })} placeholder="10.0.0.2/24" />
        <div style={{ fontSize: 10, color: M.textFaint, fontFamily: T.fontMono, marginTop: 4 }}>
          CIDR 形式（例: 10.0.0.1/24）
        </div>
      </Field>
      <Field label="MAC アドレス" hint="（任意）">
        <TextInput value={data[`${prefix}Mac`]} onChange={v => setData({ ...data, [`${prefix}Mac`]: v })} placeholder="aa:bb:cc:dd:ee:f1" />
      </Field>
      <Field label="ブリッジ">
        <SelectInput value={data[`${prefix}Bridge`]} onChange={v => setData({ ...data, [`${prefix}Bridge`]: v })} options={bridgeOptions(data[`${prefix}Ns`])} />
      </Field>
    </div>
  </div>
);

function getRole(nsId, namespaces, bridges) {
  if (!nsId) return 'host';
  const hasBridge = bridges.some(b => b.nsId === nsId);
  if (hasBridge) return 'switch';
  const ns = namespaces.find(n => n.id === nsId);
  if (ns?.ipForward) return 'router';
  return 'host';
}

export const VethAddModal = ({ data, setData, onCancel, onConfirm, namespaces, bridges, bridgeOptions }) => {
  const nsOptions = (namespaces || []).map(n => ({ value: n.id, label: n.name }));
  const roleA = getRole(data.endANs, namespaces, bridges || []);
  const roleB = getRole(data.endBNs, namespaces, bridges || []);
  const accentA = ROLE_COLOR[roleA] || T.sky;
  const accentB = ROLE_COLOR[roleB] || T.sky;

  return (
    <AddModalShell
      width={680}
      icon="⟷" iconColor={M.cyan} iconBg={M.cyanSoft}
      title="veth ペアを追加" subtitle="ip link add … type veth"
      onCancel={onCancel} onConfirm={onConfirm}
    >
      <Field label="ペア名">
        <TextInput value={data.name} onChange={v => setData({ ...data, name: v })} placeholder="veth-pair-1" />
      </Field>

      <Separator />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <EndSection label="END A" prefix="endA" data={data} setData={setData}
          nsOptions={nsOptions} bridgeOptions={bridgeOptions} accent={accentA} role={roleA} />
        <EndSection label="END B" prefix="endB" data={data} setData={setData}
          nsOptions={nsOptions} bridgeOptions={bridgeOptions} accent={accentB} role={roleB} />
      </div>
    </AddModalShell>
  );
};
