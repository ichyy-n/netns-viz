import { TOKENS as T } from "../../theme.js";
import { Modal } from "../primitives/Modal.jsx";
import { parseArp } from "../../logic/parseTables.js";
import { NAVY, NavyButton, NavyDataTable, RefreshIcon, TableTag, tableModalStyles } from "./tableTheme.jsx";

const STATE_COLOR = {
  REACHABLE: T.green,
  STALE: NAVY.textMid,
  DELAY: T.amber,
  PROBE: T.amber,
  FAILED: T.red,
  INCOMPLETE: T.red,
  PERMANENT: NAVY.cyan,
  NOARP: NAVY.textDim,
};

export const ArpModal = ({ arpModal, setArpModal, showArpTable }) => {
  const rows = parseArp(arpModal.entries);
  const columns = [
    { key: 'ip', label: 'IP', width: '1.4fr' },
    {
      key: 'mac', label: 'MAC', width: '1.6fr', muted: true,
      render: v => v ? <span style={{ color: NAVY.textMid }}>{v}</span> : null,
    },
    { key: 'dev', label: 'DEV', width: '1fr', muted: true },
    {
      key: 'state', label: 'STATE', width: '1.1fr', align: 'right',
      render: v => v ? <TableTag color={STATE_COLOR[v]}>{v}</TableTag> : null,
    },
  ];
  return (
    <Modal
      title={`ARPテーブル: ${arpModal.nsName}`}
      onClose={() => setArpModal(null)}
      width={560}
      {...tableModalStyles}
    >
      <NavyDataTable columns={columns} rows={rows} emptyText="ARPエントリがありません。pingで通信すると登録されます。" />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <NavyButton icon={<RefreshIcon />} onClick={() => showArpTable({ id: arpModal.nsId, name: arpModal.nsName })}>更新</NavyButton>
        <div style={{ flex: 1 }} />
        <NavyButton onClick={() => setArpModal(null)}>閉じる</NavyButton>
      </div>
    </Modal>
  );
};
