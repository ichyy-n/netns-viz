import React from "react";
import { TOKENS, LABELS_JP } from "../../theme.js";
import { IconStroke, ICONS } from "./IconStroke.jsx";
import { Dot } from "./Dot.jsx";
import { CommandLog } from "./CommandLog.jsx";

function hostIpFor(host, veths) {
  for (const v of veths) {
    for (const end of ['endA', 'endB']) {
      if (v[end].nsId === host.id && v[end].ip) {
        return v[end].ip.split('/')[0];
      }
    }
  }
  return null;
}

function RailSection({ k, label, count, expand, setExpand }) {
  return (
    <div onClick={() => setExpand(e => ({ ...e, [k]: !e[k] }))}
      style={{ padding: '14px 12px 4px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 9.5, color: TOKENS.textDim, fontFamily: TOKENS.fontMono,
        letterSpacing: '0.18em', fontWeight: 500, userSelect: 'none' }}>
      <IconStroke d={ICONS.chevD} size={8} color={TOKENS.textDim}
        style={{ transform: expand[k] ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
      <span style={{ flex: 1 }}>{label.toUpperCase()}</span>
      {count != null && <span style={{ color: TOKENS.textFaint }}>{count}</span>}
    </div>
  );
}

function RailItem({ id, label, icon, dot, badge, selectable = true, muted = false,
  selectedId, hoverId, onSelect, onHover }) {
  const active = selectedId === id;
  const hovered = hoverId === id;
  return (
    <div
      onMouseEnter={() => onHover && onHover(id)}
      onMouseLeave={() => onHover && onHover(null)}
      onClick={() => selectable && onSelect && onSelect(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px 5px 22px',
        fontSize: 12, fontFamily: TOKENS.fontMono,
        color: active ? TOKENS.text : (muted ? TOKENS.textDim : TOKENS.textMid),
        background: active ? TOKENS.surface2 : (hovered ? TOKENS.lineSoft : 'transparent'),
        borderLeft: active ? `2px solid ${TOKENS.indigo}` : '2px solid transparent',
        cursor: selectable ? 'pointer' : 'default', height: 26,
        transition: 'background .08s',
      }}>
      {icon && <IconStroke d={icon} size={12} color={active ? TOKENS.indigo : TOKENS.textDim} />}
      {dot && <Dot color={dot} />}
      <span style={{ flex: 1, fontWeight: active ? 500 : 400, letterSpacing: '-0.003em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {badge && <span style={{ fontSize: 10, color: TOKENS.textDim }}>{badge}</span>}
    </div>
  );
}

const vlanColor = (vid) => vid === 10 ? TOKENS.vlan10 : vid === 20 ? TOKENS.vlan20 : TOKENS.textMid;

export function LeftRail({
  railView,
  selectedId,
  onSelect,
  hoverId,
  onHover,
  execLog,
  showLog,
  onToggleLog,
  projectName = 'ch01-vlan',
}) {
  const L = LABELS_JP;
  const [expand, setExpand] = React.useState({ switches: true, hosts: true, vlans: true, links: true });
  const itemProps = { selectedId, hoverId, onSelect, onHover };

  return (
    <div style={{ width: 244, borderRight: `1px solid ${TOKENS.line}`,
      background: TOKENS.bg2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 8 }}>
        <RailSection k="proj" label={L.topLeft} expand={expand} setExpand={setExpand} />
        <RailItem id="_project" label={projectName} icon={ICONS.folder} selectable={false} {...itemProps} />

        <RailSection k="switches" label={L.switches} count={railView.switches.length} expand={expand} setExpand={setExpand} />
        {expand.switches && railView.switches.map(n => (
          <RailItem key={n.id} id={n.id} label={n.name} icon={ICONS.switch}
            badge={`${(n.bridges || []).length} bridge`} {...itemProps} />
        ))}

        <RailSection k="hosts" label={L.hosts} count={railView.hosts.length} expand={expand} setExpand={setExpand} />
        {expand.hosts && railView.hosts.map(n => {
          const ip = hostIpFor(n, railView.veths);
          return (
            <RailItem key={n.id} id={n.id} label={n.name} icon={ICONS.host}
              dot={vlanColor(n.vlan)} badge={ip || ''} {...itemProps} />
          );
        })}

        <RailSection k="vlans" label={L.vlans} count={railView.vlanIds.length} expand={expand} setExpand={setExpand} />
        {expand.vlans && railView.vlanIds.map(vid => (
          <RailItem key={`_vlan${vid}`} id={`_vlan${vid}`} label={`VLAN ${vid}`}
            icon={ICONS.vlan} dot={vlanColor(vid)} selectable={false} {...itemProps} />
        ))}

        <RailSection k="links" label={L.links} count={railView.links.length} expand={expand} setExpand={setExpand} />
        {expand.links && railView.links.map(l => {
          const aNs = railView.nsById[l.a.nsId];
          const bNs = railView.nsById[l.b.nsId];
          const aName = aNs ? aNs.name : l.a.port;
          const bName = bNs ? bNs.name : l.b.port;
          const label = l.kind === 'trunk'
            ? `${aName} ⇄ ${bName} (trunk)`
            : `${l.a.port} ⇄ ${l.b.port}`;
          return (
            <RailItem key={l.id} id={l.id} label={label} icon={ICONS.link}
              dot={l.kind === 'trunk' ? TOKENS.trunk : null}
              muted={l.kind !== 'trunk'} selectable={false} {...itemProps} />
          );
        })}
      </div>

      <CommandLog open={showLog} onToggle={onToggleLog} execLog={execLog} />
    </div>
  );
}
