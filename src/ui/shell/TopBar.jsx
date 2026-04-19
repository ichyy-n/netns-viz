import { TOKENS, LABELS_JP } from "../../theme.js";
import { IconStroke, ICONS } from "./IconStroke.jsx";
import { Dot } from "./Dot.jsx";

export function TopBar({
  projectName = 'ch01-vlan-trunk.json',
  dockerReady = false,
  dockerLoading = false,
  onStartDocker,
  onOpenTerminal,
  onApply,
  onSave,
  onLoad,
  applyCount = 0,
}) {
  const L = LABELS_JP;
  const dockerLabel = dockerLoading ? 'Docker 起動中…' : (dockerReady ? L.dockerOn : L.docker);
  const dockerColor = dockerReady ? TOKENS.green : TOKENS.textMid;
  const dockerBg = dockerReady ? TOKENS.greenSoft : 'transparent';

  return (
    <div style={{ height: 38, borderBottom: `1px solid ${TOKENS.line}`,
      background: TOKENS.bg2, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5,
          background: `linear-gradient(135deg, ${TOKENS.indigo}, ${TOKENS.magenta})` }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>netns-viz</span>
      </div>
      <span style={{ color: TOKENS.textFaint, fontSize: 11 }}>▸</span>
      <span style={{ color: TOKENS.textMid, fontSize: 12 }}>{L.workspace}</span>
      <span style={{ color: TOKENS.textFaint, fontSize: 11 }}>▸</span>
      <span style={{ color: TOKENS.text, fontSize: 12, fontFamily: TOKENS.fontMono }}>{projectName}</span>

      <div style={{ flex: 1 }} />

      <button onClick={dockerReady ? undefined : onStartDocker}
        disabled={dockerLoading || dockerReady}
        style={{ display: 'flex', alignItems: 'center', gap: 4, height: 22,
          padding: '0 8px', fontSize: 10.5, fontFamily: TOKENS.fontMono,
          background: dockerBg, color: dockerColor,
          border: dockerReady ? 'none' : `1px solid ${TOKENS.line}`,
          borderRadius: 4, cursor: (dockerReady || dockerLoading) ? 'default' : 'pointer' }}>
        <Dot color={dockerColor} size={5} />
        {dockerLabel}
      </button>

      <button onClick={() => alert('JP/EN トグルは準備中でござる')} title="Language"
        style={{ height: 24, padding: '0 8px', fontSize: 10.5, color: TOKENS.textMid,
          background: 'transparent', border: `1px solid ${TOKENS.line}`, borderRadius: 4,
          cursor: 'pointer', fontFamily: TOKENS.fontMono, letterSpacing: '0.1em' }}>
        JP
      </button>

      {onSave && (
        <button onClick={onSave} title={L.save}
          style={{ height: 24, padding: '0 6px', color: TOKENS.textMid,
            background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <IconStroke d={ICONS.save} size={13} />
        </button>
      )}
      {onLoad && (
        <button onClick={onLoad} title={L.open}
          style={{ height: 24, padding: '0 6px', color: TOKENS.textMid,
            background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <IconStroke d={ICONS.folder} size={13} />
        </button>
      )}

      <button onClick={onOpenTerminal}
        style={{ height: 24, padding: '0 8px', fontSize: 11, color: TOKENS.textMid,
          background: 'transparent', border: `1px solid ${TOKENS.line}`, borderRadius: 4, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <IconStroke d={ICONS.terminal} size={11} /> {L.terminal}
      </button>

      <button onClick={onApply}
        style={{ height: 24, padding: '0 10px', fontSize: 11, color: '#fff', fontWeight: 500,
          background: TOKENS.indigo, border: 'none', borderRadius: 4, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <IconStroke d={ICONS.bolt} size={11} color="#fff" /> {L.apply}
        {applyCount > 0 && (
          <span style={{ fontFamily: TOKENS.fontMono, fontSize: 10, opacity: 0.8, marginLeft: 2 }}>· {applyCount}</span>
        )}
      </button>
    </div>
  );
}
