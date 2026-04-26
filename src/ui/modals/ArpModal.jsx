import { TOKENS as T } from "../../theme.js";
import { Btn } from "../primitives/Btn.jsx";
import { Modal } from "../primitives/Modal.jsx";
import { DataTable, Tag } from "../primitives/DataTable.jsx";
import { parseArp } from "../../logic/parseTables.js";

const STATE_COLOR = {
  REACHABLE: T.green,
  STALE: T.textMid,
  DELAY: T.amber,
  PROBE: T.amber,
  FAILED: T.red,
  INCOMPLETE: T.red,
  PERMANENT: T.indigo,
  NOARP: T.textDim,
};

export const ArpModal = ({ arpModal, setArpModal, showArpTable }) => {
  const rows = parseArp(arpModal.entries);
  const columns = [
    { key: 'ip', label: 'IP', width: '1.4fr' },
    { key: 'mac', label: 'MAC', width: '1.6fr',
      render: v => v ? <span style={{ color: T.textMid }}>{v}</span> : null,
    },
    { key: 'dev', label: 'DEV', width: '1fr' },
    {
      key: 'state', label: 'STATE', width: '1.1fr', align: 'right',
      render: v => v ? <Tag color={STATE_COLOR[v]}>{v}</Tag> : null,
    },
  ];
  return (
    <Modal title={`ARPテーブル: ${arpModal.nsName}`} onClose={() => setArpModal(null)} width={560}>
      <DataTable columns={columns} rows={rows} emptyText="ARPエントリがありません。pingで通信すると登録されます。" />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <Btn small ghost onClick={() => showArpTable({ id: arpModal.nsId, name: arpModal.nsName })}>🔄 更新</Btn>
        <Btn small ghost onClick={() => setArpModal(null)}>閉じる</Btn>
      </div>
    </Modal>
  );
};
