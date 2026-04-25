import { TOKENS } from "../../theme.js";
import { TopBar } from "./TopBar.jsx";
import { SecondaryToolbar } from "./SecondaryToolbar.jsx";
import { LeftRail } from "./LeftRail.jsx";
import { Inspector } from "../inspector/Inspector.jsx";

export function RailShell({
  // TopBar
  projectName,
  dockerReady,
  dockerLoading,
  onStartDocker,
  onOpenHostTerminal,
  onApply,
  onSave,
  onLoad,
  applyCount,
  // SecondaryToolbar
  view,
  onViewChange,
  onAddNs,
  onAddBridge,
  onAddVeth,
  onAddVlan,
  onPaletteOpen,
  onSettings,
  // LeftRail
  railView,
  selectedId,
  onSelect,
  hoverId,
  onHover,
  execLog,
  showLog,
  onToggleLog,
  // Slots
  canvas,
  bottomPanel,
}) {
  return (
    <div style={{ width: '100vw', height: '100vh',
      background: TOKENS.bg, color: TOKENS.text,
      fontFamily: TOKENS.fontSans, display: 'flex', flexDirection: 'column',
      overflow: 'hidden' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:${TOKENS.bg}}::-webkit-scrollbar-thumb{background:${TOKENS.line};border-radius:4px}::-webkit-scrollbar-thumb:hover{background:${TOKENS.surfaceHi}}`}</style>

      <TopBar
        projectName={projectName}
        dockerReady={dockerReady}
        dockerLoading={dockerLoading}
        onStartDocker={onStartDocker}
        onOpenTerminal={onOpenHostTerminal}
        onApply={onApply}
        onSave={onSave}
        onLoad={onLoad}
        applyCount={applyCount}
      />

      <SecondaryToolbar
        view={view}
        onViewChange={onViewChange}
        onAddNs={onAddNs}
        onAddBridge={onAddBridge}
        onAddVeth={onAddVeth}
        onAddVlan={onAddVlan}
        onPaletteOpen={onPaletteOpen}
        onSettings={onSettings}
        dockerReady={dockerReady}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <LeftRail
          railView={railView}
          selectedId={selectedId}
          onSelect={onSelect}
          hoverId={hoverId}
          onHover={onHover}
          execLog={execLog}
          showLog={showLog}
          onToggleLog={onToggleLog}
          projectName={projectName}
        />

        <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex',
          flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            {canvas}
          </div>
          {bottomPanel}
        </div>

        <Inspector
          ns={railView.nsById?.[selectedId] ?? null}
          onClose={() => onSelect(null)}
        />
      </div>
    </div>
  );
}
