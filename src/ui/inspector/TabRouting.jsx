import { TOKENS } from '../../theme.js';
import { DataTable } from './DataTable.jsx';

const COLUMNS = ['dst', 'via', 'dev', 'proto'];

export function TabRouting({ ns }) {
  if (ns.routing == null) {
    return (
      <div style={{ padding: '20px 14px', color: TOKENS.textDim, fontSize: 11.5,
        fontFamily: TOKENS.fontMono, textAlign: 'center' }}>
        データ取得待ち（Phase C で実装）
      </div>
    );
  }
  return (
    <div style={{ padding: '12px 14px' }}>
      <DataTable columns={COLUMNS} rows={ns.routing} />
    </div>
  );
}
