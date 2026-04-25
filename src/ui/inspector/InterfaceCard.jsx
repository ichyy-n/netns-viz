import { useState } from 'react';
import { TOKENS } from '../../theme.js';

export function InterfaceCard({ iface, vlanAccent }) {
  const [hover, setHover] = useState(false);
  const accent = vlanAccent || TOKENS.textMid;
  const isUp = iface.state === 'UP';
  const stateColor = isUp ? TOKENS.green : TOKENS.red;
  const stateSoft = isUp ? TOKENS.greenSoft : TOKENS.redSoft;
  const ips = iface.ips || [];

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? TOKENS.surfaceHi : TOKENS.surface,
        border: `1px solid ${TOKENS.line}`, borderRadius: 6,
        padding: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: TOKENS.fontMono, color: TOKENS.text }}>
          {iface.name}
        </span>
        {iface.state && (
          <span style={{ fontSize: 9.5, fontFamily: TOKENS.fontMono, padding: '2px 6px',
            background: stateSoft, color: stateColor, borderRadius: 3,
            fontWeight: 600, letterSpacing: '0.05em' }}>
            {iface.state}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => console.log('[InterfaceCard] edit clicked:', iface.name)}
          style={{ fontSize: 10, color: TOKENS.textMid, background: 'transparent',
            border: `1px solid ${TOKENS.line}`, borderRadius: 3, padding: '2px 7px',
            cursor: 'pointer', fontFamily: TOKENS.fontMono }}>
          編集
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', rowGap: 4, columnGap: 8,
        fontSize: 11, fontFamily: TOKENS.fontMono }}>
        {ips.length > 0 && (
          <>
            <span style={{ color: TOKENS.textDim }}>IP</span>
            <div>
              {ips.map((ip) => (
                <div key={ip} style={{ color: TOKENS.text }}>{ip}</div>
              ))}
            </div>
          </>
        )}
        {iface.mac && (
          <>
            <span style={{ color: TOKENS.textDim }}>MAC</span>
            <span style={{ color: TOKENS.textMid, letterSpacing: '0.02em', fontSize: 10 }}>
              {iface.mac}
            </span>
          </>
        )}
        {iface.peer && (
          <>
            <span style={{ color: TOKENS.textDim }}>peer</span>
            <span style={{ color: TOKENS.textMid }}>{iface.peer}</span>
          </>
        )}
        {iface.vlan != null && (
          <>
            <span style={{ color: TOKENS.textDim }}>vlan</span>
            <span style={{ color: TOKENS.textMid }}>
              {iface.vlan}{iface.mode ? ` (${iface.mode})` : ''}
            </span>
          </>
        )}
        {iface.master && (
          <>
            <span style={{ color: TOKENS.textDim }}>master</span>
            <span style={{ color: TOKENS.textMid }}>{iface.master}</span>
          </>
        )}
      </div>
    </div>
  );
}
