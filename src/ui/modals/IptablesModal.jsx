import { COLORS } from "../../theme.js";
import { CHAIN_OPTIONS } from "../../logic/constants.js";
import { Btn } from "../primitives/Btn.jsx";
import { Modal } from "../primitives/Modal.jsx";

export const IptablesModal = ({ iptablesModal, setIptablesModal, iptablesMap, deleteIptablesRule, addIptablesRule }) => {
  return (
    <Modal title={`iptables: ${iptablesModal.nsName}`} onClose={() => setIptablesModal(null)} width={600}>
      {/* ルール一覧 */}
      <div style={{ maxHeight: 250, overflow: 'auto', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: COLORS.textMuted }}>Table</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: COLORS.textMuted }}>Chain</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: COLORS.textMuted }}>Target</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: COLORS.textMuted }}>Extra</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {(iptablesMap[iptablesModal.nsId] || []).map(rule => (
              <tr key={rule.id} style={{ borderBottom: `1px solid ${COLORS.border}22` }}>
                <td style={{ padding: '6px 8px', color: COLORS.text }}>{rule.table}</td>
                <td style={{ padding: '6px 8px', color: COLORS.text }}>{rule.chain}</td>
                <td style={{ padding: '6px 8px', color: iptablesModal.nsColor }}>{rule.target}</td>
                <td style={{ padding: '6px 8px', color: COLORS.textDim, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule.extra || '-'}</td>
                <td>
                  <Btn small color={COLORS.red} onClick={() => deleteIptablesRule(iptablesModal.nsId, iptablesModal.nsName, rule.id, rule)}
                    style={{ padding: '2px 6px', fontSize: 10 }}>✕</Btn>
                </td>
              </tr>
            ))}
            {!(iptablesMap[iptablesModal.nsId] || []).length && (
              <tr><td colSpan={5} style={{ padding: '12px 8px', color: COLORS.textDim, textAlign: 'center' }}>ルールなし</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ルール追加フォーム */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', padding: '12px 0', borderTop: `1px solid ${COLORS.border}` }}>
        <div>
          <label style={{ fontSize: 10, color: COLORS.textMuted, display: 'block', marginBottom: 2 }}>Table</label>
          <select value={iptablesModal.newRule.table} onChange={e => {
            const t = e.target.value;
            setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, table: t, chain: CHAIN_OPTIONS[t][0] } }));
          }} style={{ background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>
            {['filter', 'nat', 'mangle', 'raw'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, color: COLORS.textMuted, display: 'block', marginBottom: 2 }}>Chain</label>
          <select value={iptablesModal.newRule.chain} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, chain: e.target.value } }))}
            style={{ background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>
            {(CHAIN_OPTIONS[iptablesModal.newRule.table] || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, color: COLORS.textMuted, display: 'block', marginBottom: 2 }}>Target</label>
          <select value={iptablesModal.newRule.target} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, target: e.target.value } }))}
            style={{ background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>
            {['ACCEPT', 'DROP', 'REJECT', 'MASQUERADE', 'SNAT', 'DNAT', 'LOG'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted, display: 'block', marginBottom: 2 }}>Extra (match条件)</label>
          <input value={iptablesModal.newRule.extra} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, extra: e.target.value } }))}
            placeholder="-s 10.0.0.0/24 -p tcp --dport 80"
            style={{ width: '100%', background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} />
        </div>
        <Btn small onClick={() => addIptablesRule(iptablesModal.nsId, iptablesModal.nsName)}>追加</Btn>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <Btn small ghost onClick={() => setIptablesModal(null)}>閉じる</Btn>
      </div>
    </Modal>
  );
};
