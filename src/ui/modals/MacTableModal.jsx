import { TOKENS as T } from "../../theme.js";
import { Modal } from "../primitives/Modal.jsx";
import { parseFdb } from "../../logic/parseTables.js";
import { NAVY, NavyButton, NavyDataTable, NavySegmentButton, RefreshIcon, TableTag, tableModalStyles } from "./tableTheme.jsx";

export const MacTableModal = ({ macTableModal, setMacTableModal, showMacTable, showAll, setShowAll }) => {
  const allRows = parseFdb(macTableModal.entries);
  // 学習済みのみ: master でかつ permanent/self ではないエントリ
  const learnedRows = allRows.filter(r => r.flags.includes('master') && !r.flags.includes('permanent') && !r.flags.includes('self'));
  const rows = showAll ? allRows : learnedRows;

  const columns = [
    { key: 'mac', label: 'MAC', width: '1.6fr' },
    { key: 'dev', label: 'DEV', width: '1fr', muted: true },
    {
      key: 'vlan', label: 'VLAN', width: '0.6fr',
      render: v => v ? <TableTag color={T.sky}>{v}</TableTag> : null,
    },
    {
      key: 'flags', label: 'FLAGS', width: '1.1fr', align: 'right',
      render: v => v
        ? <TableTag color={v.includes('permanent') ? T.amber : v.includes('static') ? NAVY.cyan : NAVY.textMid}>
            {v.includes('permanent') ? 'permanent' : v.includes('static') ? 'static' : 'learned'}
          </TableTag>
        : null,
    },
  ];

  return (
    <Modal
      title={`MACアドレステーブル: ${macTableModal.nsName}`}
      onClose={() => { setMacTableModal(null); setShowAll(false); }}
      width={580}
      {...tableModalStyles}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <NavySegmentButton active={!showAll} onClick={() => setShowAll(false)}>学習済みのみ</NavySegmentButton>
        <NavySegmentButton active={showAll} onClick={() => setShowAll(true)}>すべて表示</NavySegmentButton>
      </div>
      <NavyDataTable
        columns={columns}
        rows={rows}
        emptyText={showAll ? 'エントリがありません' : 'まだMACアドレスが学習されていません。pingを実行すると学習されます。'}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <NavyButton icon={<RefreshIcon />} onClick={() => showMacTable({ id: macTableModal.nsId, name: macTableModal.nsName, color: macTableModal.nsColor })}>更新</NavyButton>
        <NavyButton onClick={() => { setMacTableModal(null); setShowAll(false); }}>閉じる</NavyButton>
      </div>
    </Modal>
  );
};
