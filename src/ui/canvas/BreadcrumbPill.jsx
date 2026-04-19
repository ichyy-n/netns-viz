import { TOKENS } from '../../theme.js';
import { IconStroke, ICONS } from '../shell/IconStroke.jsx';

function vlanColor(vid) {
  if (vid === 10) return TOKENS.vlan10;
  if (vid === 20) return TOKENS.vlan20;
  return TOKENS.textMid;
}

function resolveLabel(ns) {
  if (!ns) return '';
  if (ns.role === 'switch') {
    const first = Array.isArray(ns.bridges) ? ns.bridges[0] : null;
    return first?.name || 'br';
  }
  return `veth-${ns.id}`;
}

export default function BreadcrumbPill({ selectedNs }) {
  if (!selectedNs) return null;
  const isSwitch = selectedNs.role === 'switch';
  const iconPath = isSwitch ? ICONS.switch : ICONS.host;
  const iconColor = isSwitch ? TOKENS.magenta : vlanColor(selectedNs.vlan);
  const rightLabel = resolveLabel(selectedNs);

  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.line}`,
        borderRadius: 999,
        fontSize: 11,
        fontFamily: TOKENS.fontMono,
        color: TOKENS.textMid,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <IconStroke d={iconPath} size={11} color={iconColor} />
      <span style={{ color: TOKENS.text, fontWeight: 500 }}>{selectedNs.id}</span>
      <span style={{ color: TOKENS.textFaint }}>/</span>
      <span>{rightLabel}</span>
    </div>
  );
}
