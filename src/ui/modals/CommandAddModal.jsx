import { TOKENS as T } from "../../theme.js";
import { AddModalShell, Field, TextAreaInput, SelectInput } from "./addModalParts.jsx";

export const CommandAddModal = ({ data, setData, onCancel, onConfirm, namespaces }) => {
  const nsOptions = (namespaces || []).map(n => ({ value: n.id, label: n.name }));
  return (
    <AddModalShell
      width={520}
      icon="›_" iconColor={T.sky} iconBg={T.skySoft}
      title="コマンドを追加" subtitle="custom commands"
      onCancel={onCancel} onConfirm={onConfirm}
      confirmDisabled={!data.cmds?.trim()}
    >
      <Field label="ネームスペース">
        <SelectInput value={data.nsId} onChange={v => setData({ ...data, nsId: v })} options={nsOptions} />
      </Field>
      <Field label="コマンド" hint="1行1コマンド">
        <TextAreaInput value={data.cmds} onChange={v => setData({ ...data, cmds: v })}
          placeholder={"iptables -A FORWARD -j ACCEPT\ntcpdump -i veth1a -w /tmp/cap.pcap"} rows={6} />
        <div style={{ fontSize: 10, color: T.textDim, fontFamily: T.fontMono, marginTop: 6 }}>
          各コマンドは ip netns exec NS_NAME を付けて実行されます
        </div>
      </Field>
    </AddModalShell>
  );
};
