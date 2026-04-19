import { TOKENS, LABELS_JP } from "../../theme.js";
import { IconStroke, ICONS } from "./IconStroke.jsx";
import { Chip } from "./Chip.jsx";
import { Dot } from "./Dot.jsx";

const vlanColor = (vid) => vid === 10 ? TOKENS.vlan10 : vid === 20 ? TOKENS.vlan20 : TOKENS.textMid;

function Section({ label, children }) {
  return (
    <div style={{ padding: '0 14px 14px' }}>
      <div style={{ fontSize: 9.5, color: TOKENS.textDim, fontFamily: TOKENS.fontMono,
        letterSpacing: '0.18em', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function KV({ k, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0',
      fontSize: 11.5, fontFamily: mono ? TOKENS.fontMono : TOKENS.fontSans,
      borderBottom: `1px solid ${TOKENS.lineSoft}` }}>
      <span style={{ color: TOKENS.textDim }}>{k}</span>
      <span style={{ color: TOKENS.text }}>{v}</span>
    </div>
  );
}

function hostEndpointsFor(nodeId, veths) {
  const out = [];
  for (const v of veths) {
    for (const end of ['endA', 'endB']) {
      if (v[end].nsId === nodeId) {
        out.push(v[end]);
      }
    }
  }
  return out;
}

function bridgeVlansOn(nsId, portName, bridgeVlans) {
  return bridgeVlans.filter(bv => bv.nsId === nsId && bv.dev === portName);
}

function InspectorEmpty() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24, textAlign: 'center', color: TOKENS.textDim }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: TOKENS.surface,
        border: `1px solid ${TOKENS.line}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 12 }}>
        <IconStroke d={ICONS.eye} size={18} color={TOKENS.textDim} />
      </div>
      <div style={{ fontSize: 12, color: TOKENS.textMid, marginBottom: 4 }}>ノードを選択されたし</div>
      <div style={{ fontSize: 11, color: TOKENS.textFaint, lineHeight: 1.5, maxWidth: 220 }}>
        キャンバスまたは左の一覧からノードを選んでくだされ。
      </div>
    </div>
  );
}

function InspectorFooter({ onOpenShell, onOpenLog }) {
  const L = LABELS_JP;
  const btn = (enabled) => ({
    flex: 1, height: 28, fontSize: 11,
    color: enabled ? TOKENS.textMid : TOKENS.textFaint,
    background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 5,
    cursor: enabled ? 'pointer' : 'not-allowed',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    opacity: enabled ? 1 : 0.5,
  });
  return (
    <div style={{ padding: '10px 14px', borderTop: `1px solid ${TOKENS.line}`,
      display: 'flex', gap: 6, background: TOKENS.bg2, flexShrink: 0 }}>
      <button onClick={onOpenShell} disabled={!onOpenShell} style={btn(!!onOpenShell)}>
        <IconStroke d={ICONS.terminal} size={11} /> シェル
      </button>
      <button onClick={onOpenLog} disabled={!onOpenLog} style={btn(!!onOpenLog)}>
        <IconStroke d={ICONS.eye} size={11} /> {L.cmdLog}
      </button>
    </div>
  );
}

function InspectorSwitch({ node, railView, onOpenShell, onOpenLog }) {
  const bridges = node.bridges || [];
  const firstBridge = bridges[0];
  const ports = firstBridge
    ? bridgeVlansOn(node.id, firstBridge.name, railView.bridgeVlans || [])
    : [];
  const portsByName = ports.reduce((acc, p) => {
    (acc[p.dev] = acc[p.dev] || []).push(p);
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7,
            background: TOKENS.magentaSoft, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: TOKENS.magenta }}>
            <IconStroke d={ICONS.switch} size={16} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: TOKENS.fontMono, letterSpacing: '-0.01em' }}>
            {node.name}
          </div>
          <div style={{ flex: 1 }} />
          <Chip color={TOKENS.green} soft={TOKENS.greenSoft}>L2 SW</Chip>
        </div>
        <div style={{ fontSize: 11, color: TOKENS.textDim, fontFamily: TOKENS.fontMono }}>
          L2 スイッチ · 名前空間
        </div>
      </div>

      <Section label="PROPERTIES">
        <KV k="Name" v={node.name} mono />
        <KV k="Role" v="switch" mono />
        <KV k="Bridges" v={bridges.length} mono />
      </Section>

      {bridges.map(b => (
        <Section key={b.id} label={`BRIDGE · ${b.name}`}>
          <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 6,
            padding: 10, fontFamily: TOKENS.fontMono, fontSize: 11, lineHeight: 1.8 }}>
            {b.ip && <div><span style={{ color: TOKENS.textDim }}>address</span> <span style={{ color: TOKENS.text }}>{b.ip}</span></div>}
            <div><span style={{ color: TOKENS.textDim }}>id</span> <span style={{ color: TOKENS.text }}>{b.id}</span></div>
          </div>
        </Section>
      ))}

      {Object.keys(portsByName).length > 0 && (
        <Section label={`BRIDGE PORTS · ${Object.keys(portsByName).length}`}>
          {Object.entries(portsByName).map(([portName, entries]) => {
            const isTrunk = entries.length > 1
              || entries.some(e => !(e.pvid && e.untagged));
            return (
              <div key={portName} style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.line}`,
                borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Dot color={isTrunk ? TOKENS.trunk : vlanColor(entries[0].vid)} />
                  <span style={{ fontSize: 11.5, fontFamily: TOKENS.fontMono, color: TOKENS.text, fontWeight: 500 }}>
                    {portName}
                  </span>
                  <div style={{ flex: 1 }} />
                  <Chip color={isTrunk ? TOKENS.trunk : TOKENS.textDim}
                    soft={isTrunk ? TOKENS.trunkSoft : TOKENS.lineSoft}>
                    {isTrunk ? 'trunk' : 'access'}
                  </Chip>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {entries.map((e, i) => {
                    const flags = [e.pvid && 'pvid', e.untagged && 'untagged'].filter(Boolean).join(' ') || 'tagged';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4,
                        padding: '2px 6px', fontSize: 10, fontFamily: TOKENS.fontMono,
                        background: e.vid === 10 ? TOKENS.vlan10Soft : TOKENS.vlan20Soft,
                        color: vlanColor(e.vid), borderRadius: 3 }}>
                        <span>vid {e.vid}</span>
                        <span style={{ color: TOKENS.textFaint }}>·</span>
                        <span>{flags}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      <InspectorFooter onOpenShell={onOpenShell} onOpenLog={onOpenLog} />
    </div>
  );
}

function InspectorHost({ node, railView, onOpenShell, onOpenLog }) {
  const ends = hostEndpointsFor(node.id, railView.veths || []);
  const primary = ends[0];

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7,
            background: node.vlan === 10 ? TOKENS.vlan10Soft
              : node.vlan === 20 ? TOKENS.vlan20Soft : TOKENS.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: vlanColor(node.vlan) }}>
            <IconStroke d={ICONS.host} size={16} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: TOKENS.fontMono, letterSpacing: '-0.01em' }}>
            {node.name}
          </div>
          <div style={{ flex: 1 }} />
          <Chip color={TOKENS.green} soft={TOKENS.greenSoft}>HOST</Chip>
        </div>
        <div style={{ fontSize: 11, color: TOKENS.textDim, fontFamily: TOKENS.fontMono }}>
          ホスト · 名前空間
        </div>
      </div>

      <Section label="PROPERTIES">
        <KV k="Name" v={node.name} mono />
        <KV k="Role" v="host" mono />
        {node.vlan != null && <KV k="VLAN" v={node.vlan} mono />}
      </Section>

      {primary && (
        <Section label="INTERFACE">
          <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 6,
            padding: 10, fontFamily: TOKENS.fontMono, fontSize: 11, lineHeight: 1.8 }}>
            <div><span style={{ color: TOKENS.textDim }}>name</span> <span style={{ color: TOKENS.text }}>{primary.name}</span></div>
            {primary.ip && <div><span style={{ color: TOKENS.textDim }}>address</span> <span style={{ color: TOKENS.text }}>{primary.ip}</span></div>}
            {primary.mac && <div><span style={{ color: TOKENS.textDim }}>mac</span> <span style={{ color: TOKENS.text }}>{primary.mac}</span></div>}
          </div>
        </Section>
      )}

      {node.vlan != null && (
        <Section label="VLAN MEMBERSHIP">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10,
            background: node.vlan === 10 ? TOKENS.vlan10Soft
              : node.vlan === 20 ? TOKENS.vlan20Soft : TOKENS.surface,
            border: `1px solid ${vlanColor(node.vlan)}40`,
            padding: '10px 12px', borderRadius: 6 }}>
            <div style={{ width: 4, height: 30, background: vlanColor(node.vlan), borderRadius: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontFamily: TOKENS.fontMono, color: vlanColor(node.vlan), fontWeight: 600 }}>
                VLAN {node.vlan}
              </div>
              <div style={{ fontSize: 10.5, color: TOKENS.textMid, fontFamily: TOKENS.fontMono }}>
                access
              </div>
            </div>
          </div>
        </Section>
      )}

      <InspectorFooter onOpenShell={onOpenShell} onOpenLog={onOpenLog} />
    </div>
  );
}

export function Inspector({
  selectedId,
  onSelect,
  railView,
  onOpenNsTerminal,
  onToggleLog,
}) {
  const L = LABELS_JP;
  const node = selectedId ? railView?.nsById?.[selectedId] : null;

  const handleOpenShell = node && onOpenNsTerminal ? () => onOpenNsTerminal(node) : null;

  return (
    <div style={{ width: 300, borderLeft: `1px solid ${TOKENS.line}`, background: TOKENS.bg2,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${TOKENS.line}`,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 9.5, color: TOKENS.textDim, fontFamily: TOKENS.fontMono,
          letterSpacing: '0.18em', fontWeight: 500 }}>{(L.inspector || 'INSPECTOR').toUpperCase()}</span>
        <div style={{ flex: 1 }} />
        {node && onSelect && (
          <button onClick={() => onSelect(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
            title="閉じる">
            <IconStroke d={ICONS.close} size={12} color={TOKENS.textDim} />
          </button>
        )}
      </div>

      {!node && <InspectorEmpty />}
      {node && node.role === 'switch' && (
        <InspectorSwitch node={node} railView={railView}
          onOpenShell={handleOpenShell} onOpenLog={onToggleLog} />
      )}
      {node && node.role !== 'switch' && (
        <InspectorHost node={node} railView={railView}
          onOpenShell={handleOpenShell} onOpenLog={onToggleLog} />
      )}
    </div>
  );
}
