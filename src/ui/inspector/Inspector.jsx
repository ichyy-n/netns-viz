import React, { useState } from 'react';
import { TOKENS as T } from '../../theme.js';

const ROLE_COLOR = { switch: T.magenta, router: T.amber, host: T.sky };
const ROLE_LABEL = { switch: 'スイッチ', router: 'ルーター', host: 'ホスト' };

function inferRole(ns, bridges, ipForwardMap) {
  if (bridges.some(b => b.nsId === ns.id)) return 'switch';
  if (ns._ifCount >= 2 && ipForwardMap[ns.id]) return 'router';
  return 'host';
}

const Badge = ({ color, children }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '3px 8px',
    fontSize: 10, fontFamily: T.fontMono, fontWeight: 600,
    background: (color || T.textDim) + '18', color: color || T.textDim,
    borderRadius: 4, letterSpacing: '0.02em',
  }}>{children}</span>
);


const SectionHeader = ({ children, right }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, color: T.textDim, fontFamily: T.fontMono,
    marginBottom: 10, marginTop: 20, letterSpacing: '0.02em',
  }}>
    <span>{children}</span>
    <div style={{ flex: 1, height: 1, background: T.line }} />
    {right}
  </div>
);

const IfaceCard = ({ iface, accent, ns, onEditIface, onDeleteVeth, onOpenBridgeVlanModal }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.line}`, borderRadius: 6,
    padding: '10px 12px', marginBottom: 8,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: T.fontMono, color: T.text, flex: 1 }}>
        {iface.name}
      </span>
      <button onClick={() => onEditIface?.(iface.vethId, iface.end, iface.name, ns.name, iface.ip, iface.mac)}
        style={{
          fontSize: 10, color: T.textMid, background: 'transparent',
          border: `1px solid ${T.line}`, borderRadius: 3, padding: '2px 8px',
          cursor: 'pointer', fontFamily: T.fontMono,
        }}>
        編集
      </button>
      <button onClick={() => onDeleteVeth(iface.vethId)}
        style={{
          fontSize: 12, color: T.textDim, background: 'transparent',
          border: 'none', borderRadius: 3, padding: '0 4px',
          cursor: 'pointer', lineHeight: 1,
        }}>
        &times;
      </button>
    </div>
    <div style={{
      display: 'grid', gridTemplateColumns: '48px 1fr', rowGap: 5, columnGap: 10,
      fontSize: 11, fontFamily: T.fontMono,
    }}>
      {iface.ip && <>
        <span style={{ color: T.textDim }}>IP</span>
        <span style={{ color: T.text }}>{iface.ip}</span>
      </>}
      {iface.mac && <>
        <span style={{ color: T.textDim }}>MAC</span>
        <span style={{ color: T.textMid, fontSize: 10, letterSpacing: '0.02em' }}>{iface.mac}</span>
      </>}
      <span style={{ color: T.textDim }}>peer</span>
      <span style={{ color: T.textMid }}>{iface.peerLabel}</span>
    </div>
    {iface.bridge && onOpenBridgeVlanModal && (
      <button onClick={() => onOpenBridgeVlanModal(iface.bridge, '', iface.name, 'veth', iface.vethId, iface.end, ns.id)}
        style={{
          marginTop: 8, padding: '4px 8px', fontSize: 10, fontFamily: T.fontMono, fontWeight: 500,
          background: 'transparent', color: T.magenta,
          border: `1px solid ${T.magenta}30`, borderRadius: 3, cursor: 'pointer',
        }}>
        VLAN設定
      </button>
    )}
  </div>
);

export function Inspector({
  ns, bridges, veths, vlans, bridgeVlans, ipForwardMap, namespaces,
  onClose, onDeleteNs, onDeleteVeth, onEditIface, onToggleIpForward, onOpenTerminal,
  onShowRouteTable, onShowArpTable, onShowMacTable,
  onOpenBridgeVlanModal, onOpenVlanModal, onDeleteVlan, onToggleBridgeVlanFiltering,
  dockerReady,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  if (!ns) return null;

  const nsBridges = bridges.filter(b => b.nsId === ns.id);
  const nsVeths = [];
  veths.forEach(v => {
    ['endA', 'endB'].forEach(end => {
      if (v[end].nsId === ns.id) {
        const other = end === 'endA' ? 'endB' : 'endA';
        const peerNs = (namespaces || []).find(n => n.id === v[other].nsId);
        nsVeths.push({
          vethId: v.id, end, ...v[end],
          peerNsId: v[other].nsId, peerName: v[other].name,
          peerLabel: `${v[other].name}@${peerNs?.name || '?'}`,
        });
      }
    });
  });
  const nsVlans = (vlans || []).filter(vl => vl.nsId === ns.id);

  const ifCount = nsVeths.length + nsBridges.length;
  const role = inferRole({ ...ns, _ifCount: nsVeths.length }, bridges, ipForwardMap);
  const accent = ROLE_COLOR[role] || T.sky;
  const ipFwd = !!ipForwardMap[ns.id];

  return (
    <div style={{
      width: 320, borderLeft: `1px solid ${T.line}`, background: T.bg,
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 16px', borderBottom: `1px solid ${T.line}`,
      }}>
        <span style={{ fontSize: 12, color: T.textDim, fontFamily: T.fontMono, flex: 1 }}>
          インスペクタ
        </span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.textDim, fontSize: 18, padding: '0 2px', lineHeight: 1,
        }}>&times;</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', scrollbarGutter: 'stable' }}>

        {/* Hero */}
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, height: 40 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: accent + '20', border: `1px solid ${accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: accent, flexShrink: 0,
            }}>
              {role === 'switch' ? '⬡' : role === 'router' ? '⇌' : '▪'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: T.fontMono, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ns.name}
              </div>
            </div>
            {dockerReady && (
              <button onClick={() => onOpenTerminal(ns)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 11, fontFamily: T.fontMono, fontWeight: 500,
                background: T.surface, color: T.textMid,
                border: `1px solid ${T.line}`, borderRadius: 6, cursor: 'pointer', flexShrink: 0,
              }}>
                <span style={{ fontWeight: 600 }}>&gt;_</span>
                <span>ターミナル</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: `1px solid ${T.line}`,
          padding: '0 16px',
        }}>
          {[{ id: 'overview', label: '概要' }, { id: 'tables', label: 'テーブル' }].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '10px 12px', fontSize: 11, fontFamily: T.fontMono,
                color: active ? T.text : T.textDim, background: 'transparent',
                border: 'none', borderBottom: active ? `2px solid ${T.indigo}` : '2px solid transparent',
                cursor: 'pointer', fontWeight: active ? 600 : 400,
                letterSpacing: '0.05em',
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: '0 16px 16px' }}>

          {activeTab === 'tables' && dockerReady && (
            <>
              <SectionHeader>テーブル表示</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => onShowRouteTable?.(ns)} style={{
                  padding: '8px 12px', fontSize: 11, fontFamily: T.fontMono, fontWeight: 500,
                  background: T.surface, color: T.textMid, textAlign: 'left',
                  border: `1px solid ${T.line}`, borderRadius: 5, cursor: 'pointer',
                }}>
                  ルーティングテーブル
                </button>
                <button onClick={() => onShowArpTable?.(ns)} style={{
                  padding: '8px 12px', fontSize: 11, fontFamily: T.fontMono, fontWeight: 500,
                  background: T.surface, color: T.textMid, textAlign: 'left',
                  border: `1px solid ${T.line}`, borderRadius: 5, cursor: 'pointer',
                }}>
                  ARPテーブル
                </button>
                {nsBridges.length > 0 && (
                  <button onClick={() => onShowMacTable?.(ns)} style={{
                    padding: '8px 12px', fontSize: 11, fontFamily: T.fontMono, fontWeight: 500,
                    background: T.surface, color: T.textMid, textAlign: 'left',
                    border: `1px solid ${T.line}`, borderRadius: 5, cursor: 'pointer',
                  }}>
                    MACアドレステーブル
                  </button>
                )}
              </div>
              {!dockerReady && (
                <div style={{ color: T.textDim, fontSize: 11, fontFamily: T.fontMono, padding: '20px 0', textAlign: 'center' }}>
                  Docker未接続
                </div>
              )}
            </>
          )}

          {activeTab === 'tables' && !dockerReady && (
            <div style={{ color: T.textDim, fontSize: 11, fontFamily: T.fontMono, padding: '20px 0', textAlign: 'center' }}>
              Docker未接続
            </div>
          )}

          {activeTab === 'overview' && (<>
          {/* Properties */}
          <SectionHeader>プロパティ</SectionHeader>
          <div style={{
            display: 'grid', gridTemplateColumns: '72px 1fr', rowGap: 8, columnGap: 12,
            fontSize: 12, fontFamily: T.fontMono,
          }}>
            <span style={{ color: T.textDim }}>name</span>
            <span style={{ color: T.text, fontWeight: 500 }}>{ns.name}</span>
            <span style={{ color: T.textDim }}>role</span>
            <span style={{ color: T.text }}>{role}</span>
            <span style={{ color: T.textDim }}>ip_forward</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div onClick={() => dockerReady && onToggleIpForward?.(ns)}
                style={{
                  width: 32, height: 16, borderRadius: 8, cursor: dockerReady ? 'pointer' : 'default',
                  background: ipFwd ? T.green : T.surfaceHi,
                  border: `1px solid ${ipFwd ? T.green : T.line}`,
                  position: 'relative', transition: 'background 0.2s',
                }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 6,
                  background: ipFwd ? '#fff' : T.textDim,
                  position: 'absolute', top: 1,
                  left: ipFwd ? 17 : 1,
                  transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ color: ipFwd ? T.green : T.textMid, fontSize: 11 }}>
                {ipFwd ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Bridges */}
          {nsBridges.length > 0 && (
            <>
              <SectionHeader>ブリッジ &middot; {nsBridges.length}</SectionHeader>
              {nsBridges.map(b => (
                <div key={b.id} style={{
                  background: T.surface, border: `1px solid ${T.line}`, borderRadius: 6,
                  padding: '10px 12px', marginBottom: 8,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: T.fontMono, color: T.text }}>
                    {b.name}
                  </div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 5, columnGap: 10,
                    fontSize: 11, fontFamily: T.fontMono, marginTop: 8,
                  }}>
                    <span style={{ color: T.textDim }}>vlan_filtering</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div onClick={() => dockerReady && onToggleBridgeVlanFiltering?.(b.id)}
                        style={{
                          width: 32, height: 16, borderRadius: 8, cursor: dockerReady ? 'pointer' : 'default',
                          background: b.vlanFiltering ? T.green : T.surfaceHi,
                          border: `1px solid ${b.vlanFiltering ? T.green : T.line}`,
                          position: 'relative', transition: 'background 0.2s',
                        }}>
                        <div style={{
                          width: 12, height: 12, borderRadius: 6,
                          background: b.vlanFiltering ? '#fff' : T.textDim,
                          position: 'absolute', top: 1,
                          left: b.vlanFiltering ? 17 : 1,
                          transition: 'left 0.2s',
                        }} />
                      </div>
                      <span style={{ color: b.vlanFiltering ? T.green : T.textMid, fontSize: 11 }}>
                        {b.vlanFiltering ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    {b.ip && <>
                      <span style={{ color: T.textDim }}>IP</span>
                      <span style={{ color: T.text }}>{b.ip}</span>
                    </>}
                    {(() => {
                      const vids = [...new Set((bridgeVlans || []).filter(bv => bv.bridgeId === b.id).map(bv => bv.vid))].sort((a, b) => a - b);
                      if (vids.length === 0) return null;
                      return <>
                        <span style={{ color: T.textDim }}>VLANs</span>
                        <span style={{ color: T.text }}>{vids.join(', ')}</span>
                      </>;
                    })()}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Interfaces grouped by bridge */}
          {nsBridges.map(b => {
            const brVeths = nsVeths.filter(iface => iface.bridge === b.id);
            if (brVeths.length === 0) return null;
            return (
              <React.Fragment key={b.id}>
                <SectionHeader>{b.name} &middot; インターフェース &middot; {brVeths.length}</SectionHeader>
                {brVeths.map((iface, i) => (
                  <IfaceCard key={iface.id || i} iface={iface} accent={accent} ns={ns}
                    onEditIface={onEditIface} onDeleteVeth={onDeleteVeth} onOpenBridgeVlanModal={onOpenBridgeVlanModal} />
                ))}
              </React.Fragment>
            );
          })}
          {/* SVI (VLAN sub-interfaces on bridges) */}
          {nsBridges.map(b => {
            const sviList = nsVlans.filter(vl => vl.parentIface === b.name || vl.name.startsWith(b.name + '.'));
            return (
              <React.Fragment key={`svi-${b.id}`}>
                <SectionHeader right={
                  <button onClick={() => onOpenVlanModal?.(null, null, b.name, ns.id, 'bridge', b.id)}
                    style={{
                      fontSize: 10, color: T.amber, background: 'transparent',
                      border: `1px solid ${T.amber}30`, borderRadius: 3, padding: '1px 8px',
                      cursor: 'pointer', fontFamily: T.fontMono,
                    }}>
                    ＋追加
                  </button>
                }>{b.name} &middot; 仮想IF &middot; {sviList.length}</SectionHeader>
                {sviList.map(vl => (
                  <div key={vl.id} style={{
                    background: T.surface, border: `1px solid ${T.line}`, borderRadius: 6,
                    padding: '10px 12px', marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: vl.ip ? 8 : 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: T.amber, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: T.fontMono, color: T.text, flex: 1 }}>
                        {vl.name}
                      </span>
                      <button onClick={() => onOpenVlanModal?.(null, null, b.name, ns.id, 'bridge', b.id)}
                        style={{
                          fontSize: 10, color: T.textMid, background: 'transparent',
                          border: `1px solid ${T.line}`, borderRadius: 3, padding: '2px 8px',
                          cursor: 'pointer', fontFamily: T.fontMono,
                        }}>
                        編集
                      </button>
                      <button onClick={() => onDeleteVlan?.(vl.id)}
                        style={{
                          fontSize: 12, color: T.textDim, background: 'transparent',
                          border: 'none', borderRadius: 3, padding: '0 4px',
                          cursor: 'pointer', lineHeight: 1,
                        }}>
                        &times;
                      </button>
                    </div>
                    {vl.ip && (
                      <div style={{
                        display: 'grid', gridTemplateColumns: '48px 1fr', rowGap: 5, columnGap: 10,
                        fontSize: 11, fontFamily: T.fontMono,
                      }}>
                        <span style={{ color: T.textDim }}>IP</span>
                        <span style={{ color: T.text }}>{vl.ip}</span>
                      </div>
                    )}
                  </div>
                ))}
                {sviList.length === 0 && (
                  <div style={{ color: T.textDim, fontSize: 11, fontFamily: T.fontMono, padding: '8px 0', textAlign: 'center' }}>
                    仮想IF無し
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {(() => {
            const unbridged = nsVeths.filter(iface => !nsBridges.some(b => b.id === iface.bridge));
            if (unbridged.length === 0 && nsBridges.length > 0) return null;
            return (<>
              <SectionHeader>インターフェース &middot; {unbridged.length}</SectionHeader>
              {unbridged.map((iface, i) => (
                <IfaceCard key={iface.id || i} iface={iface} accent={accent} ns={ns}
                  onEditIface={onEditIface} onDeleteVeth={onDeleteVeth} />
              ))}
            </>);
          })()}

          {nsVeths.length === 0 && nsBridges.length === 0 && (
            <div style={{
              color: T.textDim, fontSize: 11, fontFamily: T.fontMono,
              padding: '20px 0', textAlign: 'center',
            }}>
              インターフェース無し
            </div>
          )}
          </>)}

        </div>
      </div>

      {/* Action bar */}
      <div style={{
        padding: '10px 16px', borderTop: `1px solid ${T.line}`,
        display: 'flex', flexWrap: 'wrap', gap: 6,
      }}>
        <div style={{ flex: 1 }} />
        <button onClick={() => onDeleteNs(ns.id)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', fontSize: 11, fontFamily: T.fontMono, fontWeight: 500,
          background: T.surface, color: T.textMid,
          border: `1px solid ${T.line}`, borderRadius: 6, cursor: 'pointer',
        }}>
          {ns.name} を削除
        </button>
      </div>
    </div>
  );
}
