import { TOKENS } from '../../theme.js';
import { InterfaceCard } from './InterfaceCard.jsx';

const ROLE_COLOR = {
  switch: TOKENS.magenta,
  router: TOKENS.amber,
  host: TOKENS.sky,
};

export function TabOverview({ ns }) {
  const ifaces = ns.interfaces || [];
  const routeCount = ns.routing?.length ?? 0;
  const arpCount = ns.arp?.length ?? 0;
  const ipFwd = ns.ipForward ? 1 : 0;
  const accent = ROLE_COLOR[ns.role] || TOKENS.textMid;

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: TOKENS.textDim, fontFamily: TOKENS.fontMono,
        marginBottom: 12, letterSpacing: '0.02em' }}>
        {`${ifaces.length} IF · ${routeCount} route · ${arpCount} arp · ip_forward=${ipFwd}`}
      </div>
      {ifaces.map((iface, i) => (
        <InterfaceCard key={iface.name || i} iface={iface} vlanAccent={accent} />
      ))}
      {ifaces.length === 0 && (
        <div style={{ color: TOKENS.textDim, fontSize: 11, fontFamily: TOKENS.fontMono,
          padding: '16px 0', textAlign: 'center' }}>
          インターフェース無し
        </div>
      )}
    </div>
  );
}
