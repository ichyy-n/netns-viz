import { TOKENS as T } from "../../theme.js";
import { AddModalShell, Field, TextInput } from "./addModalParts.jsx";

export const NsAddModal = ({ data, setData, onCancel, onConfirm }) => (
  <AddModalShell
    width={420}
    icon="□" iconColor={T.sky} iconBg={T.skySoft}
    title="ネームスペースを追加" subtitle="ip netns add"
    onCancel={onCancel} onConfirm={onConfirm}
  >
    <Field label="ネームスペース名">
      <TextInput value={data.name} onChange={v => setData({ ...data, name: v })} placeholder="ns1" />
    </Field>
  </AddModalShell>
);
