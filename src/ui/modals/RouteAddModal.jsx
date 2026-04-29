import { TOKENS as T } from "../../theme.js";
import { AddModalShell, Field, TextInput, SelectInput } from "./addModalParts.jsx";

export const RouteAddModal = ({ data, setData, onCancel, onConfirm, namespaces }) => {
  const nsOptions = (namespaces || []).map(n => ({ value: n.id, label: n.name }));

  return (
    <AddModalShell
      width={480}
      icon="→" iconColor={T.indigo} iconBg={T.indigoSoft}
      title="ルートを追加" subtitle="ip route add"
      onCancel={onCancel} onConfirm={onConfirm}
    >
      <Field label="ネームスペース">
        <SelectInput value={data.nsId} onChange={v => setData({ ...data, nsId: v })} options={nsOptions} />
      </Field>
      <Field label="宛先">
        <TextInput value={data.dest} onChange={v => setData({ ...data, dest: v })} placeholder="default or 192.168.1.0/24" />
      </Field>
      <Field label="ゲートウェイ" hint="（省略可）">
        <TextInput value={data.gateway} onChange={v => setData({ ...data, gateway: v })} placeholder="10.0.0.1" />
      </Field>
      <Field label="インターフェース" hint="（省略可）">
        <TextInput value={data.iface} onChange={v => setData({ ...data, iface: v })} placeholder="veth0" />
      </Field>
    </AddModalShell>
  );
};
