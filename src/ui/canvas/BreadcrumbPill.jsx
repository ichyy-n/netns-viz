import { TOKENS as T } from '../../theme.js';
import { IconStroke, ICONS } from '../shell/IconStroke.jsx';

const COLOR = { switch: T.magenta, router: T.amber, host: T.sky };

const ROUTER_ICON = (
  <>
    <path d="M4 14h16M9 14v-3l-2 2M11 14v-4M15 14l2-2M19 14v-4" />
    <rect x="4" y="14" width="16" height="5" rx="1.5" />
  </>
);

function iconFor(role) {
  if (role === 'switch') return ICONS.switch;
  if (role === 'host') return ICONS.host;
  return ROUTER_ICON;
}

export function BreadcrumbPill({ ns }) {
  if (!ns) return null;
  const role = ns.role || 'host';
  const color = COLOR[role] || T.sky;
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
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 999,
        fontSize: 11,
        fontFamily: T.fontMono,
        color: T.textMid,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <span style={{ color, display: 'inline-flex' }}>
        <IconStroke d={iconFor(role)} size={14} />
      </span>
      <span style={{ color: T.text, fontWeight: 500 }}>{ns.name}</span>
      <span style={{ color: T.textFaint }}>·</span>
      <span>{role}</span>
      <span style={{ color: T.textFaint }}>·</span>
      <span>{(ns.interfaces || []).length} IF</span>
    </div>
  );
}
