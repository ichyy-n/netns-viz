import { useState } from "react";
import { TOKENS as T } from "../../theme.js";
import { Modal } from "../primitives/Modal.jsx";
import { parseRoutes } from "../../logic/parseTables.js";
import { NAVY, NavyButton, RefreshIcon, TableTag, tableModalStyles } from "./tableTheme.jsx";

const PROTO_COLOR = {
  kernel: '#6f82bd',
  static: NAVY.cyan,
  boot: T.amber,
  dhcp: T.green,
};

const RouteIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14h16" />
    <path d="M9 14v-3l-2 2" />
    <path d="M11 14v-4" />
    <path d="M15 14l2-2" />
    <path d="M19 14v-4" />
    <rect x="4" y="14" width="16" height="5" rx="1.5" />
  </svg>
);

const PlusIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const TrashIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
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

const RouteProto = ({ value }) => {
  if (!value) return <span style={{ color: NAVY.textFaint }}>-</span>;
  return <TableTag color={PROTO_COLOR[value] || NAVY.textMid}>{value}</TableTag>;
};

const RouteRows = ({ rows, onDelete }) => (
  <div style={{
    background: NAVY.bg,
    border: `1px solid ${NAVY.lineSoft}`,
    borderRadius: 8,
    overflow: 'hidden',
  }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.45fr 1.25fr 1.15fr 1fr 0.7fr 30px',
      gap: 12,
      padding: '10px 14px',
      background: NAVY.bg2,
      borderBottom: `1px solid ${NAVY.line}`,
      color: NAVY.textFaint,
      fontSize: 10,
      fontFamily: T.fontMono,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    }}>
      <span>DESTINATION</span>
      <span>VIA</span>
      <span>DEV</span>
      <span>PROTO</span>
      <span style={{ textAlign: 'right' }}>METRIC</span>
      <span />
    </div>
    <div className="inspector-scroll" style={{ maxHeight: 360, overflow: 'auto' }}>
      {rows.length === 0 ? (
        <div style={{ padding: '24px 14px', color: NAVY.textDim, fontSize: 11.5, fontFamily: T.fontMono, textAlign: 'center' }}>
          ルートが登録されていません
        </div>
      ) : rows.map((row, i) => {
        const isDefault = row.dst === 'default';
        return (
          <div key={`${row.dst}-${row.dev}-${i}`} style={{
            display: 'grid',
            gridTemplateColumns: '1.45fr 1.25fr 1.15fr 1fr 0.7fr 30px',
            gap: 12,
            alignItems: 'center',
            padding: '11px 14px',
            borderBottom: i < rows.length - 1 ? `1px solid ${NAVY.lineSoft}` : 'none',
            color: NAVY.text,
            fontSize: 12.5,
            fontFamily: T.fontMono,
          }}>
            <span style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: isDefault ? NAVY.cyan : NAVY.text,
              fontWeight: isDefault ? 600 : 500,
            }}>
              {isDefault && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: NAVY.cyan, marginRight: 9, verticalAlign: 'middle' }} />}
              {row.dst}
            </span>
            <span style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: row.via ? NAVY.textMid : NAVY.textFaint,
              fontStyle: row.via ? 'normal' : 'italic',
            }}>
              {row.via || 'direct'}
            </span>
            <span style={{ color: NAVY.text }}>{row.dev || '-'}</span>
            <RouteProto value={row.proto} />
            <span style={{ color: NAVY.textDim, textAlign: 'right' }}>{row.metric || '0'}</span>
            <button onClick={() => onDelete(row)}
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
        );
      })}
    </div>
  </div>
);

export const RouteModal = ({ routeModal, setRouteModal, showRouteTable, addRouteRule, deleteRouteRule }) => {
  const [newRoute, setNewRoute] = useState({ dest: '', gateway: '', iface: '' });
  const rows = parseRoutes(routeModal.routes);
  const addRoute = async () => {
    const ok = await addRouteRule({
      nsId: routeModal.nsId,
      dest: newRoute.dest,
      gateway: newRoute.gateway,
      iface: newRoute.iface,
    }, true);
    if (ok) setNewRoute({ dest: '', gateway: '', iface: '' });
  };
  const deleteRoute = async (row) => {
    await deleteRouteRule({
      nsId: routeModal.nsId,
      dest: row.dst,
      gateway: row.via || '',
      iface: row.dev || '',
    }, true);
  };

  return (
    <Modal
      title={
        <>
          Routing Table: {routeModal.nsName}
          <span style={{ color: NAVY.textDim, fontWeight: 500, marginLeft: 10 }}>ip route show</span>
        </>
      }
      onClose={() => setRouteModal(null)}
      width={760}
      {...tableModalStyles}
      headerIcon={<RouteIcon />}
      headerColor={T.amber}
      footer={
        <>
          <NavyButton icon={<RefreshIcon />} onClick={() => showRouteTable({ id: routeModal.nsId, name: routeModal.nsName })}>更新</NavyButton>
          <div style={{ flex: 1 }} />
          <NavyButton onClick={() => setRouteModal(null)}>閉じる</NavyButton>
        </>
      }
    >
      <RouteRows rows={rows} onDelete={deleteRoute} />
      <div style={{
        padding: '12px 14px',
        marginTop: 14,
        background: NAVY.bg2,
        border: `1px solid ${NAVY.line}`,
        borderRadius: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ color: NAVY.text, fontSize: 11, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.08em' }}>
            ルート追加
          </div>
          <div style={{ flex: 1, height: 1, background: NAVY.line }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.25fr 1.25fr 1.1fr 150px',
          gap: 10,
          alignItems: 'end',
        }}>
          <div>
            <FieldLabel>Destination</FieldLabel>
            <input value={newRoute.dest} onChange={e => setNewRoute(prev => ({ ...prev, dest: e.target.value }))}
              placeholder="default or 192.168.1.0/24"
              style={fieldBase} />
          </div>
          <div>
            <FieldLabel>Via</FieldLabel>
            <input value={newRoute.gateway} onChange={e => setNewRoute(prev => ({ ...prev, gateway: e.target.value }))}
              placeholder="10.0.0.1"
              style={fieldBase} />
          </div>
          <div>
            <FieldLabel>Dev</FieldLabel>
            <input value={newRoute.iface} onChange={e => setNewRoute(prev => ({ ...prev, iface: e.target.value }))}
              placeholder="veth0"
              style={fieldBase} />
          </div>
          <div>
            <FieldLabel>&nbsp;</FieldLabel>
            <AddPrimaryButton onClick={addRoute} />
          </div>
        </div>
      </div>
    </Modal>
  );
};
