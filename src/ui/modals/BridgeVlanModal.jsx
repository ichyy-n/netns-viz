import { COLORS } from "../../theme.js";
import { Btn } from "../primitives/Btn.jsx";
import { Input } from "../primitives/Input.jsx";
import { Modal } from "../primitives/Modal.jsx";

export const BridgeVlanModal = ({ bridgeVlanModal, setBridgeVlanModal, bridgeVlans, deleteBridgeVlan, applyPortMode }) => {
  return (
    <Modal title={`VLAN設定: ${bridgeVlanModal.dev} (${bridgeVlanModal.bridgeName})`} onClose={() => setBridgeVlanModal(null)} width={480}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>ポートモード</span>
        <div style={{ display: "flex", gap: 12 }}>
          {['access', 'trunk', 'custom'].map(mode => (
            <label key={mode} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: bridgeVlanModal.portMode === mode ? COLORS.cyan : COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
              <input type="radio" name="portMode" checked={bridgeVlanModal.portMode === mode}
                onChange={() => setBridgeVlanModal({...bridgeVlanModal, portMode: mode})}
                style={{ accentColor: COLORS.cyan }} />
              {mode === 'access' ? 'Access' : mode === 'trunk' ? 'Trunk' : 'Custom'}
            </label>
          ))}
        </div>
      </div>

      {bridgeVlanModal.portMode === 'access' && (
        <Input label="VLAN ID" value={bridgeVlanModal.accessVid}
          onChange={v => setBridgeVlanModal({...bridgeVlanModal, accessVid: v})} mono placeholder="100" />
      )}

      {bridgeVlanModal.portMode === 'trunk' && (<>
        <Input label="VLAN IDs (カンマ区切り)" value={bridgeVlanModal.trunkVids}
          onChange={v => setBridgeVlanModal({...bridgeVlanModal, trunkVids: v})} mono placeholder="10,20,30" />
        <Input label="ネイティブVLAN (任意)" value={bridgeVlanModal.trunkNativeVid}
          onChange={v => setBridgeVlanModal({...bridgeVlanModal, trunkNativeVid: v})} mono placeholder="10" />
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
            <input type="checkbox" checked={bridgeVlanModal.removeDefaultVlan}
              onChange={e => setBridgeVlanModal({...bridgeVlanModal, removeDefaultVlan: e.target.checked})} />
            デフォルトVLAN(1)を除去
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
            <input type="checkbox" checked={bridgeVlanModal.applySelf}
              onChange={e => setBridgeVlanModal({...bridgeVlanModal, applySelf: e.target.checked})} />
            ブリッジ自体(self)にも設定
          </label>
        </div>
      </>)}

      {bridgeVlanModal.portMode === 'custom' && (<>
        <Input label="VID" value={bridgeVlanModal.newVid}
          onChange={v => setBridgeVlanModal({...bridgeVlanModal, newVid: v})} mono placeholder="100" />
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
            <input type="checkbox" checked={bridgeVlanModal.newPvid}
              onChange={e => setBridgeVlanModal({...bridgeVlanModal, newPvid: e.target.checked})} />
            PVID
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>
            <input type="checkbox" checked={bridgeVlanModal.newUntagged}
              onChange={e => setBridgeVlanModal({...bridgeVlanModal, newUntagged: e.target.checked})} />
            Untagged
          </label>
        </div>
      </>)}

      {/* Current VLAN entries */}
      {(() => {
        const existing = bridgeVlans.filter(bv => bv.bridgeId === bridgeVlanModal.bridgeId && bv.dev === bridgeVlanModal.dev);
        if (!existing.length) return null;
        return (
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>現在の設定</span>
            {existing.map(bv => (
              <div key={bv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: COLORS.bg, borderRadius: 4, marginBottom: 4, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: COLORS.text }}>VID {bv.vid}</span>
                {bv.pvid && <span style={{ color: COLORS.cyan, fontSize: 9, background: COLORS.cyan+"20", padding: "1px 4px", borderRadius: 3 }}>PVID</span>}
                {bv.untagged && <span style={{ color: COLORS.green, fontSize: 9, background: COLORS.green+"20", padding: "1px 4px", borderRadius: 3 }}>Untag</span>}
                <span style={{ flex: 1 }} />
                <span onClick={() => deleteBridgeVlan(bv.id)} style={{ color: COLORS.red, cursor: "pointer", fontSize: 10 }}>✕</span>
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn ghost small onClick={() => setBridgeVlanModal(null)}>閉じる</Btn>
        <Btn small color={COLORS.cyan} onClick={applyPortMode}>設定</Btn>
      </div>
    </Modal>
  );
};
