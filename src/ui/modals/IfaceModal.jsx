import { COLORS } from "../../theme.js";
import { Btn } from "../primitives/Btn.jsx";
import { Input } from "../primitives/Input.jsx";
import { Modal } from "../primitives/Modal.jsx";

export const IfaceModal = ({ ifaceModal, setIfaceModal, deleteIfaceIp, changeIface }) => {
  return (
    <Modal title={`インターフェース設定: ${ifaceModal.ifaceName}`} onClose={() => setIfaceModal(null)} width={420}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8 }}>
        <span>現在のIP: <span style={{ color: COLORS.text }}>{ifaceModal.currentIp || '(未設定)'}</span></span>
      </div>
      <Input label="新しいIPアドレス (CIDR)" value={ifaceModal.newIp} onChange={v => setIfaceModal({...ifaceModal, newIp: v})} mono placeholder="192.168.1.1/24" />
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        現在のMAC: <span style={{ color: COLORS.text }}>{ifaceModal.currentMac || '(未取得)'}</span>
      </div>
      <Input label="新しいMACアドレス" value={ifaceModal.newMac} onChange={v => setIfaceModal({...ifaceModal, newMac: v})} mono placeholder="aa:bb:cc:dd:ee:ff" />
      <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 12 }}>※ MAC変更時はインターフェースを一時的にdownします</div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn ghost small onClick={() => setIfaceModal(null)}>キャンセル</Btn>
        <Btn small color={COLORS.orange} onClick={changeIface} disabled={!ifaceModal.newIp && !ifaceModal.newMac}>変更</Btn>
      </div>
    </Modal>
  );
};
