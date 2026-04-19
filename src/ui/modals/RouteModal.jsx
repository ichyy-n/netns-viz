import { COLORS } from "../../theme.js";
import { Btn } from "../primitives/Btn.jsx";
import { Modal } from "../primitives/Modal.jsx";

export const RouteModal = ({ routeModal, setRouteModal, showRouteTable }) => {
  return (
    <Modal title={`Routing Table: ${routeModal.nsName}`} onClose={() => setRouteModal(null)} width={500}>
      <pre style={{ background: COLORS.bg, color: COLORS.green, padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7, border: `1px solid ${COLORS.border}`, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>
        {routeModal.routes || '(empty)'}
      </pre>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <Btn small ghost onClick={() => showRouteTable({ id: routeModal.nsId, name: routeModal.nsName })}>🔄 更新</Btn>
        <Btn small ghost onClick={() => setRouteModal(null)}>閉じる</Btn>
      </div>
    </Modal>
  );
};
