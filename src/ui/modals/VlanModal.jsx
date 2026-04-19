import { COLORS } from "../../theme.js";
import { Btn } from "../primitives/Btn.jsx";
import { Input } from "../primitives/Input.jsx";
import { Modal } from "../primitives/Modal.jsx";

export const VlanModal = ({ vlanModal, setVlanModal, vlans, confirmVlan }) => {
  return (
    <Modal title={`VLAN サブインターフェース: ${vlanModal.ifaceName}`} onClose={() => setVlanModal(null)} width={420}>
      <Input label="VLAN ID (1-4094)" value={vlanModal.vlanId}
        onChange={v => setVlanModal({...vlanModal, vlanId: v})} mono placeholder="100" />
      <Input label="IPアドレス (任意)" value={vlanModal.ip}
        onChange={v => setVlanModal({...vlanModal, ip: v})} mono placeholder="10.0.100.1/24" />
      <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 11, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
        <input type="checkbox" checked={vlanModal.removeParentIp}
          onChange={e => setVlanModal({...vlanModal, removeParentIp: e.target.checked})} />
        親インターフェースのIPを削除
      </label>

      {/* Existing VLANs */}
      {(() => {
        const existing = vlans.filter(vl => vl.parentId === vlanModal.vethId && vl.parentEnd === vlanModal.end);
        if (!existing.length) return null;
        return (
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>既存のVLAN</span>
            {existing.map(vl => (
              <div key={vl.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: COLORS.bg, borderRadius: 4, marginBottom: 4, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: COLORS.cyan }}>🏷 {vl.name}</span>
                {vl.ip && <span style={{ color: COLORS.textDim }}>{vl.ip}</span>}
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn ghost small onClick={() => setVlanModal(null)}>キャンセル</Btn>
        <Btn small color={COLORS.orange} onClick={confirmVlan}>追加</Btn>
      </div>
    </Modal>
  );
};
