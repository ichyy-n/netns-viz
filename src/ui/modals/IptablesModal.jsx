import { TOKENS as T } from "../../theme.js";
import { CHAIN_OPTIONS } from "../../logic/constants.js";
import { Modal } from "../primitives/Modal.jsx";
import { NAVY, NavyButton, TableTag, tableModalStyles } from "./tableTheme.jsx";

const TABLES = ['filter', 'nat', 'mangle', 'raw'];
const TARGETS = ['ACCEPT', 'DROP', 'REJECT', 'MASQUERADE', 'SNAT', 'DNAT', 'LOG'];

const TrashIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
  </svg>
);

const PlusIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const FilterIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h18" />
    <path d="M7 12h10" />
    <path d="M10 19h4" />
  </svg>
);

const fieldBase = {
  height: 30,
  width: '100%',
  background: NAVY.bg,
  color: NAVY.text,
  border: `1px solid ${NAVY.line}`,
  borderRadius: 5,
  padding: '0 10px',
  fontSize: 12,
  fontFamily: T.fontMono,
  outline: 'none',
};

const FieldLabel = ({ children }) => (
  <label style={{
    display: 'block',
    marginBottom: 6,
    color: NAVY.textDim,
    fontSize: 10,
    fontFamily: T.fontMono,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  }}>
    {children}
  </label>
);

const TargetBadge = ({ target }) => {
  const map = {
    ACCEPT: [T.green, T.greenSoft],
    DROP: [T.red, T.redSoft],
    REJECT: [T.red, T.redSoft],
    MASQUERADE: [NAVY.cyan, NAVY.cyanSoft],
    SNAT: [NAVY.cyan, NAVY.cyanSoft],
    DNAT: [NAVY.cyan, NAVY.cyanSoft],
    LOG: [T.amber, T.amberSoft],
  };
  const [color, soft] = map[target] || [NAVY.textDim, NAVY.surfaceHi];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      minWidth: 104,
      padding: '3px 10px',
      color,
      background: soft,
      borderRadius: 4,
      fontSize: 11,
      fontFamily: T.fontMono,
      fontWeight: 600,
      letterSpacing: '0.05em',
    }}>
      {target}
    </span>
  );
};

const AddPrimaryButton = ({ onClick }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 30, width: '100%', padding: '0 14px',
    color: '#fff', background: NAVY.cyan,
    border: 'none', borderRadius: 5, cursor: 'pointer',
    fontSize: 11.5, fontFamily: T.fontMono, fontWeight: 600,
    boxShadow: `0 1px 0 rgba(255,255,255,0.12) inset, 0 4px 12px ${NAVY.cyan}33`,
  }}>
    <PlusIcon />
    追加
  </button>
);

export const IptablesModal = ({ iptablesModal, setIptablesModal, iptablesMap, deleteIptablesRule, addIptablesRule }) => {
  const rules = iptablesMap[iptablesModal.nsId] || [];
  const activeTable = iptablesModal.newRule.table;
  const visibleRules = rules.filter(rule => rule.table === activeTable);
  const chainOptions = CHAIN_OPTIONS[activeTable] || [];

  const setActiveTable = (table) => {
    setIptablesModal(prev => ({
      ...prev,
      newRule: {
        ...prev.newRule,
        table,
        chain: CHAIN_OPTIONS[table]?.[0] || '',
      },
    }));
  };

  return (
    <Modal
      title={`iptables: ${iptablesModal.nsName}`}
      onClose={() => setIptablesModal(null)}
      width={760}
      {...tableModalStyles}
      headerIcon={<FilterIcon />}
      headerColor={T.amber}
      footer={
        <>
          <div style={{ flex: 1 }} />
          <NavyButton onClick={() => setIptablesModal(null)}>閉じる</NavyButton>
        </>
      }
    >
      <div style={{
        display: 'flex',
        gap: 0,
        width: 'fit-content',
        marginBottom: 14,
        padding: 3,
        background: NAVY.bg,
        border: `1px solid ${NAVY.line}`,
        borderRadius: 6,
      }}>
        {TABLES.map(table => {
          const active = activeTable === table;
          const count = rules.filter(rule => rule.table === table).length;
          return (
            <button key={table} onClick={() => setActiveTable(table)} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 12px',
              color: active ? NAVY.text : NAVY.textDim,
              background: active ? NAVY.surfaceHi : 'transparent',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: T.fontMono,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}>
              {table}
              <span style={{
                padding: '1px 5px',
                color: active ? NAVY.cyan : NAVY.textFaint,
                background: active ? NAVY.cyanSoft : NAVY.surfaceHi,
                borderRadius: 3,
                fontSize: 9.5,
                fontWeight: 600,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{
        background: NAVY.bg,
        border: `1px solid ${NAVY.lineSoft}`,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 14,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '30px 120px 130px 1fr 30px',
          gap: 8,
          padding: '8px 12px',
          background: NAVY.bg2,
          borderBottom: `1px solid ${NAVY.line}`,
          color: NAVY.textFaint,
          fontSize: 9.5,
          fontFamily: T.fontMono,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          <span>#</span>
          <span>CHAIN</span>
          <span>TARGET</span>
          <span>MATCH</span>
          <span />
        </div>
        <div className="inspector-scroll" style={{ maxHeight: 270, overflow: 'auto' }}>
          {visibleRules.length === 0 ? (
            <div style={{ padding: '24px 12px', color: NAVY.textDim, fontSize: 11.5, fontFamily: T.fontMono, textAlign: 'center' }}>
              ルールなし
            </div>
          ) : visibleRules.map((rule, i) => (
            <div key={rule.id} style={{
              display: 'grid',
              gridTemplateColumns: '30px 120px 130px 1fr 30px',
              gap: 8,
              alignItems: 'center',
              padding: '9px 12px',
              borderBottom: i < visibleRules.length - 1 ? `1px solid ${NAVY.lineSoft}` : 'none',
              fontSize: 11.5,
              fontFamily: T.fontMono,
            }}>
              <span style={{ color: NAVY.textFaint }}>{i + 1}</span>
              <span style={{ color: NAVY.text, fontWeight: 500 }}>{rule.chain}</span>
              <TargetBadge target={rule.target} />
              <span style={{ color: NAVY.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {rule.extra || '-'}
              </span>
              <button onClick={() => deleteIptablesRule(iptablesModal.nsId, iptablesModal.nsName, rule.id, rule)}
                title="削除"
                style={{
                  width: 24,
                  height: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: NAVY.textDim,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}>
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: '12px 14px',
        background: NAVY.bg2,
        border: `1px solid ${NAVY.line}`,
        borderRadius: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ color: NAVY.text, fontSize: 11, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.08em' }}>
            ルール追加
          </div>
          <div style={{ flex: 1, height: 1, background: NAVY.line }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '130px 130px 1fr 170px',
          gap: 10,
          alignItems: 'end',
        }}>
          <div>
            <FieldLabel>Chain</FieldLabel>
            <select value={iptablesModal.newRule.chain} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, chain: e.target.value } }))}
              style={fieldBase}>
              {chainOptions.map(chain => <option key={chain} value={chain}>{chain}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Target</FieldLabel>
            <select value={iptablesModal.newRule.target} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, target: e.target.value } }))}
              style={fieldBase}>
              {TARGETS.map(target => <option key={target} value={target}>{target}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Match</FieldLabel>
            <input value={iptablesModal.newRule.extra} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, extra: e.target.value } }))}
              placeholder="-s 10.0.0.0/24 -p tcp --dport 80"
              style={fieldBase} />
          </div>
          <div>
            <FieldLabel>&nbsp;</FieldLabel>
            <AddPrimaryButton onClick={() => addIptablesRule(iptablesModal.nsId, iptablesModal.nsName)} />
          </div>
        </div>
      </div>
    </Modal>
  );
};
