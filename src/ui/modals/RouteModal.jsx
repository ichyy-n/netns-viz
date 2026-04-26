import { TOKENS as T } from "../../theme.js";
import { Btn } from "../primitives/Btn.jsx";
import { Modal } from "../primitives/Modal.jsx";
import { DataTable, Tag } from "../primitives/DataTable.jsx";
import { parseRoutes } from "../../logic/parseTables.js";

const PROTO_COLOR = {
  kernel: T.textMid,
  static: T.indigo,
  boot: T.amber,
  dhcp: T.green,
};

export const RouteModal = ({ routeModal, setRouteModal, showRouteTable }) => {
  const rows = parseRoutes(routeModal.routes);
  const columns = [
    { key: 'dst', label: 'DST', width: '1.5fr' },
    { key: 'via', label: 'VIA', width: '1.2fr' },
    { key: 'dev', label: 'DEV', width: '1fr' },
    {
      key: 'proto', label: 'PROTO', width: '1fr', align: 'right',
      render: v => v ? <Tag color={PROTO_COLOR[v]}>{v}</Tag> : null,
    },
  ];
  return (
    <Modal title={`ルーティングテーブル: ${routeModal.nsName}`} onClose={() => setRouteModal(null)} width={560}>
      <DataTable columns={columns} rows={rows} emptyText="ルートが登録されていません" />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <Btn small ghost onClick={() => showRouteTable({ id: routeModal.nsId, name: routeModal.nsName })}>🔄 更新</Btn>
        <Btn small ghost onClick={() => setRouteModal(null)}>閉じる</Btn>
      </div>
    </Modal>
  );
};
