import { TOKENS as T } from "../../theme.js";
import { Btn } from "../primitives/Btn.jsx";
import { Modal } from "../primitives/Modal.jsx";
import { DataTable, Tag } from "../primitives/DataTable.jsx";
import { parseFdb } from "../../logic/parseTables.js";

export const MacTableModal = ({ macTableModal, setMacTableModal, showMacTable, showAll, setShowAll }) => {
  const allRows = parseFdb(macTableModal.entries);
  // 学習済みのみ: master でかつ permanent/self ではないエントリ
  const learnedRows = allRows.filter(r => r.flags.includes('master') && !r.flags.includes('permanent') && !r.flags.includes('self'));
  const rows = showAll ? allRows : learnedRows;

  const columns = [
    { key: 'mac', label: 'MAC', width: '1.6fr' },
    { key: 'dev', label: 'DEV', width: '1fr' },
    { key: 'vlan', label: 'VLAN', width: '0.6fr',
      render: v => v ? <Tag color={T.sky}>{v}</Tag> : null,
    },
    {
      key: 'flags', label: 'FLAGS', width: '1.1fr', align: 'right',
      render: v => v
        ? <Tag color={v.includes('permanent') ? T.amber : v.includes('static') ? T.indigo : T.textMid}>
            {v.includes('permanent') ? 'permanent' : v.includes('static') ? 'static' : 'learned'}
          </Tag>
        : null,
    },
  ];

  return (
    <Modal title={`MACアドレステーブル: ${macTableModal.nsName}`} onClose={() => { setMacTableModal(null); setShowAll(false); }} width={580}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => setShowAll(false)} style={{
          padding: '5px 10px', fontSize: 11, fontFamily: T.fontMono, fontWeight: 500,
          background: !showAll ? T.surface : 'transparent', color: !showAll ? T.text : T.textMid,
          border: `1px solid ${T.line}`, borderRadius: 5, cursor: 'pointer',
        }}>学習済みのみ</button>
        <button onClick={() => setShowAll(true)} style={{
          padding: '5px 10px', fontSize: 11, fontFamily: T.fontMono, fontWeight: 500,
          background: showAll ? T.surface : 'transparent', color: showAll ? T.text : T.textMid,
          border: `1px solid ${T.line}`, borderRadius: 5, cursor: 'pointer',
        }}>すべて表示</button>
      </div>
      <DataTable columns={columns} rows={rows}
        emptyText={showAll ? 'エントリがありません' : 'まだMACアドレスが学習されていません。pingを実行すると学習されます。'} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <Btn small ghost onClick={() => showMacTable({ id: macTableModal.nsId, name: macTableModal.nsName, color: macTableModal.nsColor })}>🔄 更新</Btn>
        <Btn small ghost onClick={() => { setMacTableModal(null); setShowAll(false); }}>閉じる</Btn>
      </div>
    </Modal>
  );
};
