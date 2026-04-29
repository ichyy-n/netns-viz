import { TOKENS as T } from "../../theme.js";
import { AddModalShell, Field, TextInput, Separator, M } from "./addModalParts.jsx";

export const IfaceModal = ({ ifaceModal, setIfaceModal, deleteIfaceIp, changeIface }) => (
  <AddModalShell
    width={460}
    icon="⟷" iconColor={T.amber} iconBg={T.amberSoft}
    title={`${ifaceModal.ifaceName} を編集`} subtitle="ip addr / ip link set"
    onCancel={() => setIfaceModal(null)}
    onConfirm={changeIface}
    confirmLabel="変更"
    confirmDisabled={!ifaceModal.newIp && !ifaceModal.newMac}
  >
    <Field label="現在の IP">
      <div style={{ fontSize: 13, color: M.text, fontFamily: T.fontMono, padding: '10px 12px', background: M.bg, border: `1px solid ${M.line}`, borderRadius: 6 }}>
        {ifaceModal.currentIp || '(未設定)'}
      </div>
    </Field>
    <Field label="新しい IP アドレス" hint="（CIDR）">
      <TextInput value={ifaceModal.newIp} onChange={v => setIfaceModal({ ...ifaceModal, newIp: v })} placeholder="192.168.1.1/24" />
    </Field>

    <Separator />

    <Field label="現在の MAC">
      <div style={{ fontSize: 13, color: M.text, fontFamily: T.fontMono, padding: '10px 12px', background: M.bg, border: `1px solid ${M.line}`, borderRadius: 6 }}>
        {ifaceModal.currentMac || '(未取得)'}
      </div>
    </Field>
    <Field label="新しい MAC アドレス" hint="（任意）">
      <TextInput value={ifaceModal.newMac} onChange={v => setIfaceModal({ ...ifaceModal, newMac: v })} placeholder="aa:bb:cc:dd:ee:ff" />
      <div style={{ fontSize: 10, color: M.textDim, fontFamily: T.fontMono, marginTop: 4 }}>
        MAC 変更時はインターフェースを一時的に down します
      </div>
    </Field>
  </AddModalShell>
);
