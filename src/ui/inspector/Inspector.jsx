import { useState } from 'react';
import { TOKENS } from '../../theme.js';
import { IconStroke, ICONS } from '../shell/IconStroke.jsx';
import { TabOverview } from './TabOverview.jsx';
import { TabRouting } from './TabRouting.jsx';
import { TabArp } from './TabArp.jsx';
import { TabMac } from './TabMac.jsx';

export function Inspector({ ns, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  if (!ns) return null;

  const routingCount = ns.routing?.length ?? 0;
  const arpCount = ns.arp?.length ?? 0;
  const macCount = ns.macTable?.length ?? 0;

  const tabs = [
    { id: 'overview', label: '概要', show: true },
    { id: 'routing', label: 'ルート', show: ns.role === 'router' || ns.role === 'host', count: routingCount },
    { id: 'arp', label: 'ARP', show: true, count: arpCount },
    { id: 'mac', label: 'MAC', show: ns.role === 'switch', count: macCount },
  ].filter((t) => t.show);

  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? 'overview');

  return (
    <div style={{ border: `1px solid ${TOKENS.line}`, borderRadius: 6, background: TOKENS.bg2,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${TOKENS.line}`,
        background: TOKENS.bg2, padding: '0 6px', gap: 2 }}>
        {tabs.map((t) => {
          const active = currentTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '10px 10px', fontSize: 9.5, fontFamily: TOKENS.fontMono,
                letterSpacing: '0.12em', color: active ? TOKENS.text : TOKENS.textDim,
                background: 'transparent', border: 'none',
                borderBottom: active ? `2px solid ${TOKENS.indigo}` : '2px solid transparent',
                cursor: 'pointer', fontWeight: active ? 500 : 400 }}>
              {t.label}
              {t.count !== undefined && (
                <span style={{ color: TOKENS.textFaint, fontSize: 9, marginLeft: 2, letterSpacing: 0 }}>
                  · {t.count}
                </span>
              )}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {onClose && (
          <button onClick={onClose} title="閉じる"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 6, color: TOKENS.textDim, display: 'inline-flex' }}>
            <IconStroke d={ICONS.close} size={12} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {currentTab === 'overview' && <TabOverview ns={ns} />}
        {currentTab === 'routing' && <TabRouting ns={ns} />}
        {currentTab === 'arp' && <TabArp ns={ns} />}
        {currentTab === 'mac' && <TabMac ns={ns} />}
      </div>
    </div>
  );
}
