import { useState, useCallback, useRef, useEffect } from "react";
import { COLORS, NS_COLORS, NS_W, TOKENS } from "./theme.js";
import { uid } from "./logic/ids.js";
import { validateCidr, CIDR_ERROR_MSG, validateRouteDestination, ROUTE_DEST_ERROR_MSG } from "./logic/validation.js";
import { getInterfacePositions } from "./logic/topology.js";
import { enrichBridgeVlans } from "./logic/enrich.js";
import { defaultState, loadGuiState, saveGuiState } from "./logic/state.js";
import { saveFile, loadFile } from "./ipc/file.js";
import { dockerStart, dockerExec, onDockerStatus } from "./ipc/docker.js";
import { openShell, closeShell, sendCommand, killSession, writeSession, onShellData } from "./ipc/shell.js";
import { Icon, Icons } from "./ui/primitives/Icon.jsx";
import { Btn } from "./ui/primitives/Btn.jsx";
import { Input } from "./ui/primitives/Input.jsx";
import { Select } from "./ui/primitives/Select.jsx";
import { Modal } from "./ui/primitives/Modal.jsx";
import { RouteModal } from "./ui/modals/RouteModal.jsx";
import { ArpModal } from "./ui/modals/ArpModal.jsx";
import { MacTableModal } from "./ui/modals/MacTableModal.jsx";
import { BridgeAddModal } from "./ui/modals/BridgeAddModal.jsx";
import { NsAddModal } from "./ui/modals/NsAddModal.jsx";
import { VethAddModal } from "./ui/modals/VethAddModal.jsx";
import { CommandAddModal } from "./ui/modals/CommandAddModal.jsx";
import { IfaceModal } from "./ui/modals/IfaceModal.jsx";
import { VlanModal } from "./ui/modals/VlanModal.jsx";
import { BridgeVlanModal } from "./ui/modals/BridgeVlanModal.jsx";
import { IptablesModal } from "./ui/modals/IptablesModal.jsx";
import { NAVY, NavyButton, tableModalStyles } from "./ui/modals/tableTheme.jsx";
import { HostTerminal } from "./ui/terminal/HostTerminal.jsx";
import { NsTerminal } from "./ui/terminal/NsTerminal.jsx";
import { VethEdge } from "./ui/canvas/VethEdge.jsx";
import { NamespaceNode } from "./ui/canvas/NamespaceNode.jsx";
import { Canvas } from "./ui/canvas/Canvas.jsx";
import { Inspector } from "./ui/inspector/Inspector.jsx";

const isElectron = () => Boolean(window.electronAPI);
const DOCK_MIN_HEIGHT = 140;
const DOCK_DEFAULT_HEIGHT = 260;
const DOCK_VIEWPORT_MARGIN = 120;

const clampDockHeight = (height) => {
  if (typeof window === "undefined") return Math.max(DOCK_MIN_HEIGHT, height);
  const maxHeight = Math.max(DOCK_MIN_HEIGHT, window.innerHeight - DOCK_VIEWPORT_MARGIN);
  return Math.min(maxHeight, Math.max(DOCK_MIN_HEIGHT, height));
};

/* ══════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════ */
export default function NetnsVisualizer() {
  const [state, setState] = useState(loadGuiState);
  const [dragging, setDragging] = useState(null);
  const [modal, setModal] = useState(null);
  const [cmdLog, setCmdLog] = useState([]);
  const [showCmd, setShowCmd] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [selected, setSelected] = useState(null);
  const svgRef = useRef(null);

  const [dockerReady, setDockerReady] = useState(false);
  const [dockerLoading, setDockerLoading] = useState(false);
  const [terminalTabs, setTerminalTabs] = useState([]);
  const [activeTermTab, setActiveTermTab] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [dockMaximized, setDockMaximized] = useState(false);
  const [dockHeight, setDockHeight] = useState(DOCK_DEFAULT_HEIGHT);
  const [dockResizing, setDockResizing] = useState(null);
  const [execLog, setExecLog] = useState([]);
  const [routeModal, setRouteModal] = useState(null);
  const [macTableModal, setMacTableModal] = useState(null);
  const [macTableShowAll, setMacTableShowAll] = useState(false);
  const [arpTableModal, setArpTableModal] = useState(null);
  const [ifaceModal, setIfaceModal] = useState(null);
  const [vlanModal, setVlanModal] = useState(null);
  const [bridgeVlanModal, setBridgeVlanModal] = useState(null);
  const [vethCtxMenu, setVethCtxMenu] = useState(null);
  const logEndRef = useRef(null);

  const { namespaces, bridges, veths, vlans, bridgeVlans, routes, commands } = state;
  const [showVlanSubIface] = useState(false);
  const [ipForwardMap, setIpForwardMap] = useState({});
  const [iptablesMap, setIptablesMap] = useState({});
  const [iptablesModal, setIptablesModal] = useState(null);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const update = useCallback((fn) => { setState(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; }); setIsDirty(true); }, []);
  const swapVethEnds = useCallback((vethId) => {
    update(s => {
      const v = s.veths.find(vv => vv.id === vethId);
      if (!v) return;
      v.swapped = !v.swapped;
    });
    setVethCtxMenu(null);
  }, [update]);
  const addExecLog = useCallback((cmd, output, ok = true) => setExecLog(prev => [...prev, { cmd, output, success: ok, time: new Date().toLocaleTimeString() }]), []);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [execLog]);
  useEffect(() => {
    saveGuiState(state);
  }, [state]);

  const startDockResize = useCallback((e) => {
    if (dockMaximized) return;
    e.preventDefault();
    setDockResizing({ startY: e.clientY, startHeight: dockHeight });
  }, [dockMaximized, dockHeight]);

  const adjustDockHeight = useCallback((delta) => {
    setDockHeight((height) => clampDockHeight(height + delta));
  }, []);

  useEffect(() => {
    if (!dockResizing) return;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    const onMove = (e) => {
      setDockHeight(clampDockHeight(dockResizing.startHeight + dockResizing.startY - e.clientY));
    };
    const onUp = () => setDockResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dockResizing]);

  useEffect(() => {
    const onResize = () => setDockHeight((height) => clampDockHeight(height));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Docker ── */
  const startDocker = useCallback(async () => {
    if (!isElectron()) return;
    setDockerLoading(true);
    try {
      const r = await dockerStart();
      if (r.success) { setDockerReady(true); addExecLog('docker start', 'Container started'); }
    } catch (e) { addExecLog('docker start', e.message, false); }
    setDockerLoading(false);
  }, [addExecLog]);

  useEffect(() => {
    if (!isElectron() || !window.electronAPI.status?.onDockerStatus) return;
    return onDockerStatus((payload) => {
      if (payload?.source !== 'resume') return;
      // まずdockerReadyをfalseにして全ターミナルのuseEffectクリーンアップを発火
      setDockerReady(false);
      if (payload?.ok) {
        // 次tickでtrueに戻し、シェルを再オープン
        setTimeout(() => {
          setDockerReady(true);
          addExecLog('docker resume', payload?.restarted ? 'Container restarted after sleep' : 'Reconnected after sleep');
        }, 100);
      } else {
        addExecLog('docker resume', payload?.error || 'Reconnect failed', false);
      }
    });
  }, [addExecLog]);

  useEffect(() => {
    if (!dockerReady || !namespaces.length) return;
    const syncOnResume = async () => {
      // ip_forward: Linux実態を読み取り
      const fwUpdates = {};
      for (const ns of namespaces) {
        const r = await dockerExec(`ip netns exec ${ns.name} cat /proc/sys/net/ipv4/ip_forward`);
        if (r.success) fwUpdates[ns.id] = (r.output || '').trim() === '1';
      }
      if (Object.keys(fwUpdates).length) setIpForwardMap(prev => ({ ...prev, ...fwUpdates }));

      // iptables: Reactステートから再適用（resume後はiptablesルールが消えているため）
      for (const [nsId, rules] of Object.entries(iptablesMap)) {
        const ns = namespaces.find(n => n.id === nsId);
        if (!ns || !rules.length) continue;
        for (const rule of rules) {
          const extraPart = rule.extra ? ` ${rule.extra}` : '';
          await dockerExec(`ip netns exec ${ns.name} iptables -t ${rule.table} -A ${rule.chain}${extraPart} -j ${rule.target}`);
        }
      }

      // bridgeVlans: Reactステートから再適用（resume後はbridge vlan設定が消えているため）
      for (const bv of bridgeVlans) {
        const ns = namespaces.find(n => n.id === bv.nsId);
        if (!ns) continue;
        let cmd = `ip netns exec ${ns.name} bridge vlan add dev ${bv.dev} vid ${bv.vid}`;
        if (bv.devType === 'self') cmd += ' self';
        if (bv.pvid) cmd += ' pvid';
        if (bv.untagged) cmd += ' untagged';
        await dockerExec(cmd);
      }
    };
    syncOnResume();
  }, [dockerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const execAndLog = useCallback(async (cmd) => {
    if (!isElectron() || !dockerReady) return { success: false, output: 'Docker not ready' };
    const r = await dockerExec(cmd);
    addExecLog(cmd, r.output || (r.success ? 'OK' : 'Failed'), r.success);
    return r;
  }, [dockerReady, addExecLog]);

  const toggleIpForward = useCallback(async (ns) => {
    const cur = ipForwardMap[ns.id] || false;
    const val = cur ? 0 : 1;
    const r = await execAndLog(`ip netns exec ${ns.name} sysctl -w net.ipv4.ip_forward=${val}`);
    if (r.success) setIpForwardMap(prev => ({ ...prev, [ns.id]: !cur }));
  }, [ipForwardMap, execAndLog]);

  const addIptablesRule = useCallback(async (nsId, nsName) => {
    if (!iptablesModal) return;
    const { table, chain, target, extra } = iptablesModal.newRule;
    const ruleId = uid();
    const extraPart = extra ? ` ${extra}` : '';
    const cmd = `ip netns exec ${nsName} iptables -t ${table} -A ${chain}${extraPart} -j ${target}`;
    const r = await execAndLog(cmd);
    if (!r.success) { alert(`iptables追加失敗: ${r.output}`); return; }
    setIptablesMap(prev => ({
      ...prev,
      [nsId]: [...(prev[nsId] || []), { id: ruleId, table, chain, target, extra }]
    }));
    setIptablesModal(prev => prev ? ({ ...prev, newRule: { ...prev.newRule, target: 'ACCEPT', extra: '' } }) : null);
  }, [iptablesModal, execAndLog]);

  const deleteIptablesRule = useCallback(async (nsId, nsName, ruleId, rule) => {
    const extraPart = rule.extra ? ` ${rule.extra}` : '';
    const cmd = `ip netns exec ${nsName} iptables -t ${rule.table} -D ${rule.chain}${extraPart} -j ${rule.target}`;
    const r = await execAndLog(cmd);
    if (!r.success) { alert(`iptables削除失敗: ${r.output}`); return; }
    setIptablesMap(prev => ({
      ...prev,
      [nsId]: (prev[nsId] || []).filter(r => r.id !== ruleId)
    }));
  }, [execAndLog]);

  // Shared: clean existing env → rebuild from data → update GUI state
  const applyTopologyData = useCallback(async (data) => {
    setExecLog([]);
    let fwResult = {};
    if (dockerReady) {
      addExecLog('load', 'Cleaning current environment...');
      const listResult = await dockerExec('ip netns list');
      if (listResult.success && listResult.output) {
        const existingNs = listResult.output.trim().split('\n')
          .map(line => line.split(/\s/)[0]).filter(Boolean);
        for (const nsName of existingNs) {
          await execAndLog(`ip netns del ${nsName}`);
        }
      }
      addExecLog('load', 'Rebuilding from data...');

      for (const ns of data.namespaces) await execAndLog(`ip netns add ${ns.name}`);

      for (const b of (data.bridges || [])) {
        const ns = data.namespaces.find(n => n.id === b.nsId);
        if (!ns) continue;
        const p = `ip netns exec ${ns.name}`;
        await execAndLog(`${p} ip link add ${b.name} type bridge`);
        await execAndLog(`${p} ip link set ${b.name} up`);
        if (b.ip) await execAndLog(`${p} ip addr add ${b.ip} dev ${b.name}`);
        if (b.vlanFiltering) await execAndLog(`${p} ip link set ${b.name} type bridge vlan_filtering 1`);
      }

      for (const v of (data.veths || [])) {
        const nsA = data.namespaces.find(n => n.id === v.endA.nsId);
        const nsB = data.namespaces.find(n => n.id === v.endB.nsId);
        await execAndLog(`ip link add ${v.endA.name} type veth peer name ${v.endB.name}`);
        if (nsA) await execAndLog(`ip link set ${v.endA.name} netns ${nsA.name}`);
        if (nsB) await execAndLog(`ip link set ${v.endB.name} netns ${nsB.name}`);
        const pA = nsA ? `ip netns exec ${nsA.name}` : "";
        const pB = nsB ? `ip netns exec ${nsB.name}` : "";
        if (v.endA.bridge) { const br = (data.bridges || []).find(b => b.id === v.endA.bridge); if (br) await execAndLog(`${pA} ip link set ${v.endA.name} master ${br.name}`); }
        if (v.endB.bridge) { const br = (data.bridges || []).find(b => b.id === v.endB.bridge); if (br) await execAndLog(`${pB} ip link set ${v.endB.name} master ${br.name}`); }
        if (v.endA.ip) await execAndLog(`${pA} ip addr add ${v.endA.ip} dev ${v.endA.name}`);
        if (v.endB.ip) await execAndLog(`${pB} ip addr add ${v.endB.ip} dev ${v.endB.name}`);
        await execAndLog(`${pA} ip link set ${v.endA.name} up`);
        await execAndLog(`${pB} ip link set ${v.endB.name} up`);
      }

      for (const rt of (data.routes || [])) {
        const ns = data.namespaces.find(n => n.id === rt.nsId);
        if (!ns) continue;
        const dev = rt.iface ? ` dev ${rt.iface}` : "";
        const via = rt.gateway ? ` via ${rt.gateway}` : "";
        await execAndLog(`ip netns exec ${ns.name} ip route add ${rt.dest}${via}${dev}`);
      }

      for (const vl of (data.vlans || [])) {
        const ns = data.namespaces.find(n => n.id === vl.nsId);
        if (!ns) continue;
        const p = `ip netns exec ${ns.name}`;
        const parentName = vl.parentIface || vl.name.split('.')[0];
        await execAndLog(`${p} ip link add link ${parentName} name ${vl.name} type vlan id ${vl.vlanId || vl.vid}`);
        await execAndLog(`${p} ip link set ${vl.name} up`);
        if (vl.ip) await execAndLog(`${p} ip addr add ${vl.ip} dev ${vl.name}`);
      }

      for (const bv of (data.bridgeVlans || [])) {
        const ns = data.namespaces.find(n => n.id === bv.nsId);
        if (!ns) continue;
        let cmd = `ip netns exec ${ns.name} bridge vlan add dev ${bv.dev} vid ${bv.vid}`;
        if (bv.devType === 'self') cmd += ' self';
        if (bv.pvid) cmd += ' pvid';
        if (bv.untagged) cmd += ' untagged';
        await execAndLog(cmd);
      }

      for (const cmd of (data.commands || [])) {
        const ns = data.namespaces.find(n => n.id === cmd.nsId);
        if (!ns) continue;
        const lines = cmd.cmds.split('\n').filter(l => l.trim());
        for (const line of lines) {
          await execAndLog(`ip netns exec ${ns.name} ${line.trim()}`);
        }
      }
      for (const ns of data.namespaces) {
        if (data.ipForwardMap && data.ipForwardMap[ns.id]) {
          await execAndLog(`ip netns exec ${ns.name} sysctl -w net.ipv4.ip_forward=1`);
        }
      }
      // iptables復元
      if (data.iptablesMap) {
        for (const [nsId, rules] of Object.entries(data.iptablesMap)) {
          const ns = data.namespaces.find(n => n.id === nsId);
          if (!ns || !rules.length) continue;
          for (const rule of rules) {
            const extraPart = rule.extra ? ` ${rule.extra}` : '';
            await execAndLog(`ip netns exec ${ns.name} iptables -t ${rule.table} -A ${rule.chain}${extraPart} -j ${rule.target}`);
          }
        }
      }
      addExecLog('load', 'Environment rebuilt ✓');

      // Read actual Linux ip_forward state for all namespaces
      const fwUpdates = {};
      for (const ns of data.namespaces) {
        const fwRes = await dockerExec(
          `ip netns exec ${ns.name} cat /proc/sys/net/ipv4/ip_forward`
        );
        if (fwRes.success) {
          fwUpdates[ns.id] = (fwRes.output || '').trim() === '1';
        }
      }
      fwResult = fwUpdates;
    }

    if (!Array.isArray(data.commands)) data.commands = [];
    if (!Array.isArray(data.vlans)) data.vlans = [];
    if (!Array.isArray(data.bridgeVlans)) data.bridgeVlans = [];
    enrichBridgeVlans(data.bridgeVlans, data.veths || [], data.bridges || []);
    setState(data);
    setIpForwardMap(prev => ({ ...prev, ...(data.ipForwardMap || {}), ...fwResult }));
    setIptablesMap(data.iptablesMap || {});
    setTerminalTabs([]); setActiveTermTab(null); setShowTerminal(false);
  }, [dockerReady, execAndLog, addExecLog]);

  const fetchIfaceRuntime = useCallback(async (ifaceName, nsName) => {
    if (!dockerReady) return { ip: "", mac: null };
    const [ipRes, macRes] = await Promise.all([
      dockerExec(`ip netns exec ${nsName} sh -lc "ip -o -4 addr show dev ${ifaceName} 2>/dev/null | awk '{print \\$4; exit}'"`),
      dockerExec(`ip netns exec ${nsName} cat /sys/class/net/${ifaceName}/address 2>/dev/null`),
    ]);
    return {
      ip: ipRes.success ? (ipRes.output || "").trim() : "",
      mac: macRes.success ? (macRes.output || "").trim() || null : null,
    };
  }, [dockerReady]);

  const syncVethRuntime = useCallback(async () => {
    if (!dockerReady || !veths.length) return;
    const updates = [];
    for (const v of veths) {
      for (const end of ["endA", "endB"]) {
        const ns = namespaces.find(n => n.id === v[end].nsId);
        if (!ns) continue;
        const runtime = await fetchIfaceRuntime(v[end].name, ns.name);
        updates.push({ vethId: v.id, end, ...runtime });
      }
    }
    if (!updates.length) return;

    setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      updates.forEach(u => {
        const veth = next.veths.find(vv => vv.id === u.vethId);
        if (!veth) return;
        veth[u.end].ip = u.ip;
        veth[u.end].mac = u.mac;
      });
      return next;
    });
  }, [dockerReady, veths, namespaces, fetchIfaceRuntime]);

  useEffect(() => {
    if (!dockerReady) return;
    const timer = setInterval(syncVethRuntime, 2000);
    return () => clearInterval(timer);
  }, [dockerReady, syncVethRuntime]);

  /* ── Terminal tabs ── */
  const openTerminal = useCallback((ns) => {
    setShowTerminal(true);
    const count = terminalTabs.filter(t => t.nsId === ns.id).length;
    const tabId = `${ns.id}_${Date.now()}`;
    const isSw = bridges.some(b => b.nsId === ns.id);
    let ifCount = 0;
    veths.forEach(v => { if (v.endA.nsId === ns.id) ifCount++; if (v.endB.nsId === ns.id) ifCount++; });
    const role = isSw ? 'switch' : (ifCount >= 2 && ipForwardMap[ns.id]) ? 'router' : 'host';
    const roleColor = { switch: TOKENS.magenta, router: TOKENS.amber, host: TOKENS.sky }[role];
    setTerminalTabs(prev => [...prev, {
      tabId,
      kind: 'ns',
      nsId: ns.id,
      nsName: ns.name,
      color: roleColor,
      role,
      label: count === 0 ? ns.name : `${ns.name} (${count + 1})`,
    }]);
    setActiveTermTab(tabId);
  }, [terminalTabs, bridges, veths, ipForwardMap]);

  const openHostTerminal = useCallback(() => {
    setShowTerminal(true);
    const count = terminalTabs.filter(t => t.kind === 'host').length;
    const tabId = `host_${Date.now()}`;
    setTerminalTabs(prev => [...prev, {
      tabId,
      kind: 'host',
      color: COLORS.cyan,
      label: count === 0 ? 'host' : `host (${count + 1})`,
    }]);
    setActiveTermTab(tabId);
  }, [terminalTabs]);

  const closeTermTab = useCallback((tabId) => {
    if (isElectron() && window.electronAPI.docker.closeShell) {
      closeShell(`${tabId}-shell`);
    }
    setTerminalTabs(prev => {
      const next = prev.filter(t => t.tabId !== tabId);
      if (activeTermTab === tabId) setActiveTermTab(next.length ? next[next.length - 1].tabId : '__log__');
      return next;
    });
  }, [activeTermTab]);

  /* ── VLAN functions ── */
  const toggleBridgeVlanFiltering = useCallback(async (bridgeId) => {
    const br = bridges.find(b => b.id === bridgeId);
    if (!br) return;
    const ns = namespaces.find(n => n.id === br.nsId);
    if (!ns) return;
    const newVal = !br.vlanFiltering;
    if (dockerReady) {
      await execAndLog(`ip netns exec ${ns.name} ip link set ${br.name} type bridge vlan_filtering ${newVal ? 1 : 0}`);
    }
    update(s => {
      const b = s.bridges.find(b => b.id === bridgeId);
      if (b) b.vlanFiltering = newVal;
      if (!newVal) s.bridgeVlans = s.bridgeVlans.filter(bv => bv.bridgeId !== bridgeId);
    });
  }, [bridges, namespaces, dockerReady, execAndLog, update]);

  const openBridgeVlanModal = useCallback((bridgeId, bridgeName, dev, devType, vethId, vethEnd, nsId) => {
    const existing = bridgeVlans.filter(bv => bv.bridgeId === bridgeId && bv.dev === dev);
    const hasAccessConfig = existing.length === 1 && existing[0].pvid && existing[0].untagged;
    const currentMode = existing.length === 0 ? 'access' : hasAccessConfig ? 'access' : 'trunk';
    setBridgeVlanModal({
      bridgeId, bridgeName, dev, devType, vethId, vethEnd, nsId,
      portMode: currentMode,
      accessVid: hasAccessConfig ? String(existing[0].vid) : '',
      trunkVids: currentMode === 'trunk' ? existing.map(bv => bv.vid).join(',') : '',
      trunkNativeVid: currentMode === 'trunk' ? String((existing.find(bv => bv.pvid) || {}).vid || '') : '',
      removeDefaultVlan: true,
      applySelf: false,
      newVid: '', newPvid: false, newUntagged: false,
    });
  }, [bridgeVlans]);

  const applyPortMode = useCallback(async () => {
    if (!bridgeVlanModal) return;
    const { bridgeId, bridgeName, dev, devType, vethId, vethEnd, nsId, portMode } = bridgeVlanModal;
    const ns = namespaces.find(n => n.id === nsId);
    if (!ns) return;
    const prefix = `ip netns exec ${ns.name}`;

    // Auto-enable vlan_filtering
    const br = bridges.find(b => b.id === bridgeId);
    if (br && !br.vlanFiltering && dockerReady) {
      await execAndLog(`${prefix} ip link set ${bridgeName} type bridge vlan_filtering 1`);
      update(s => { const b = s.bridges.find(b => b.id === bridgeId); if (b) b.vlanFiltering = true; });
    }

    if (portMode === 'custom') {
      // Custom mode: add single VLAN entry
      const vid = parseInt(bridgeVlanModal.newVid, 10);
      if (!vid || vid < 1 || vid > 4094) { setBridgeVlanModal(null); return; }
      if (dockerReady) {
        let cmd = `${prefix} bridge vlan add dev ${dev} vid ${vid}`;
        if (bridgeVlanModal.newPvid) cmd += ' pvid';
        if (bridgeVlanModal.newUntagged) cmd += ' untagged';
        await execAndLog(cmd);
      }
      update(s => {
        s.bridgeVlans.push({ id: uid(), bridgeId, dev, devType, vethId, vethEnd, vid, pvid: bridgeVlanModal.newPvid, untagged: bridgeVlanModal.newUntagged, nsId });
      });
      setBridgeVlanModal(null);
      return;
    }

    // Access/Trunk: clear existing VLANs for this port
    const existingBvs = bridgeVlans.filter(bv => bv.bridgeId === bridgeId && bv.dev === dev);
    if (dockerReady) {
      for (const bv of existingBvs) {
        let cmd = `${prefix} bridge vlan del dev ${dev} vid ${bv.vid}`;
        if (bv.devType === 'self') cmd += ' self';
        await execAndLog(cmd);
      }
      if (bridgeVlanModal.removeDefaultVlan) {
        await execAndLog(`${prefix} bridge vlan del vid 1 dev ${dev}`).catch(() => {});
      }
    }

    if (portMode === 'access') {
      const vid = parseInt(bridgeVlanModal.accessVid, 10);
      if (!vid || vid < 1 || vid > 4094) { setBridgeVlanModal(null); return; }
      if (dockerReady) {
        await execAndLog(`${prefix} bridge vlan add vid ${vid} dev ${dev} pvid untagged`);
      }
      update(s => {
        s.bridgeVlans = s.bridgeVlans.filter(bv => !(bv.bridgeId === bridgeId && bv.dev === dev));
        s.bridgeVlans.push({ id: uid(), bridgeId, dev, devType, vethId, vethEnd, vid, pvid: true, untagged: true, nsId });
      });
    } else if (portMode === 'trunk') {
      const vids = bridgeVlanModal.trunkVids.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= 4094);
      if (!vids.length) { setBridgeVlanModal(null); return; }
      const nativeVid = parseInt(bridgeVlanModal.trunkNativeVid, 10) || null;
      if (dockerReady) {
        for (const vid of vids) {
          const isNative = vid === nativeVid;
          let cmd = `${prefix} bridge vlan add vid ${vid} dev ${dev}`;
          if (isNative) cmd += ' pvid untagged';
          await execAndLog(cmd);
          if (bridgeVlanModal.applySelf) {
            await execAndLog(`${prefix} bridge vlan add vid ${vid} dev ${bridgeName} self`);
          }
        }
      }
      update(s => {
        s.bridgeVlans = s.bridgeVlans.filter(bv => !(bv.bridgeId === bridgeId && bv.dev === dev));
        for (const vid of vids) {
          const isNative = vid === nativeVid;
          s.bridgeVlans.push({ id: uid(), bridgeId, dev, devType, vethId, vethEnd, vid, pvid: isNative, untagged: isNative, nsId });
        }
      });
    }
    setBridgeVlanModal(null);
  }, [bridgeVlanModal, bridges, bridgeVlans, namespaces, dockerReady, execAndLog, update]);

  const deleteBridgeVlan = useCallback(async (bvId) => {
    const bv = bridgeVlans.find(b => b.id === bvId);
    if (!bv) return;
    const ns = namespaces.find(n => n.id === bv.nsId);
    if (dockerReady && ns) {
      let cmd = `ip netns exec ${ns.name} bridge vlan del dev ${bv.dev} vid ${bv.vid}`;
      if (bv.devType === 'self') cmd += ' self';
      await execAndLog(cmd);
    }
    update(s => { s.bridgeVlans = s.bridgeVlans.filter(b => b.id !== bvId); });
  }, [bridgeVlans, namespaces, dockerReady, execAndLog, update]);

  const openVlanModal = useCallback((vethId, end, ifaceName, nsId, parentType = 'veth', parentId = null) => {
    setVlanModal({ vethId, end, ifaceName, nsId, vlanId: '', ip: '', removeParentIp: false, parentType, parentId: parentId || vethId });
  }, []);

  const confirmVlan = useCallback(async () => {
    if (!vlanModal) return;
    const { vethId, end, ifaceName, nsId, vlanId: vidStr, ip, removeParentIp, parentType: pType = 'veth', parentId: pId } = vlanModal;
    if (!validateCidr(ip)) { alert(CIDR_ERROR_MSG); return; }
    const vid = parseInt(vidStr, 10);
    if (!vid || vid < 1 || vid > 4094) return;
    const ns = namespaces.find(n => n.id === nsId);
    if (!ns) return;
    const prefix = `ip netns exec ${ns.name}`;
    const subName = `${ifaceName}.${vid}`;

    if (dockerReady) {
      if (removeParentIp && pType === 'veth') {
        const v = veths.find(vv => vv.id === vethId);
        const parentIp = v ? v[end].ip : null;
        if (parentIp) await execAndLog(`${prefix} ip addr del ${parentIp} dev ${ifaceName}`);
      }
      await execAndLog(`${prefix} ip link add link ${ifaceName} name ${subName} type vlan id ${vid}`);
      await execAndLog(`${prefix} ip link set ${subName} up`);
      if (ip) await execAndLog(`${prefix} ip addr add ${ip} dev ${subName}`);
    }
    update(s => {
      s.vlans.push({ id: uid(), parentType: pType, parentId: pId || vethId, parentEnd: end || null, vlanId: vid, name: subName, ip: ip || null, nsId, parentIface: ifaceName });
    });
    setVlanModal(null);
  }, [vlanModal, namespaces, veths, dockerReady, execAndLog, update]);

  const showRouteTable = useCallback(async (ns) => {
    if (!dockerReady) return;
    const r = await dockerExec(`ip netns exec ${ns.name} ip route show`);
    setRouteModal({ nsId: ns.id, nsName: ns.name, nsColor: ns.color, routes: r.success ? r.output : 'Failed to fetch routes' });
  }, [dockerReady]);


  const showMacTable = useCallback(async (ns) => {
    if (!dockerReady) return;
    const br = bridges.find(b => b.nsId === ns.id);
    if (!br) return;
    const r = await dockerExec(`ip netns exec ${ns.name} bridge fdb show br ${br.name}`);
    setMacTableModal({ nsId: ns.id, nsName: ns.name, nsColor: ns.color, entries: r.success ? r.output : 'Failed to fetch MAC table' });
  }, [dockerReady, bridges]);

  const showArpTable = useCallback(async (ns) => {
    if (!dockerReady) return;
    const r = await dockerExec(`ip netns exec ${ns.name} ip neigh show`);
    setArpTableModal({ nsId: ns.id, nsName: ns.name, nsColor: ns.color, entries: r.success ? r.output : 'Failed to fetch ARP table' });
  }, [dockerReady]);

  const showIptables = useCallback((ns) => {
    setIptablesModal({
      nsId: ns.id,
      nsName: ns.name,
      nsColor: ns.color,
      newRule: { table: 'filter', chain: 'INPUT', target: 'ACCEPT', extra: '' }
    });
  }, []);

  const addRouteRule = useCallback(async (data, refreshTable = false) => {
    if (!validateRouteDestination(data.dest)) {
      alert(ROUTE_DEST_ERROR_MSG);
      return false;
    }
    if (!data.gateway && !data.iface) {
      alert("GATEWAYまたはINTERFACEのいずれかを入力してください");
      return false;
    }
    const ns = namespaces.find(n => n.id === data.nsId);
    if (dockerReady && ns) {
      const dev = data.iface ? ` dev ${data.iface}` : "";
      const via = data.gateway ? ` via ${data.gateway}` : "";
      const r = await execAndLog(`ip netns exec ${ns.name} ip route add ${data.dest}${via}${dev}`);
      if (!r.success) { alert(`ルート追加失敗: ${r.output}`); return false; }
    }
    update(s => s.routes.push({ id: uid(), nsId: data.nsId, dest: data.dest, gateway: data.gateway, iface: data.iface }));
    if (refreshTable && ns && dockerReady) await showRouteTable(ns);
    return true;
  }, [namespaces, dockerReady, execAndLog, update, showRouteTable]);

  const deleteRouteRule = useCallback(async (data, refreshTable = false) => {
    const ns = namespaces.find(n => n.id === data.nsId);
    if (dockerReady && ns) {
      const dev = data.iface ? ` dev ${data.iface}` : "";
      const via = data.gateway ? ` via ${data.gateway}` : "";
      const r = await execAndLog(`ip netns exec ${ns.name} ip route del ${data.dest}${via}${dev}`);
      if (!r.success) { alert(`ルート削除失敗: ${r.output}`); return false; }
    }
    update(s => {
      s.routes = s.routes.filter(r => !(
        r.nsId === data.nsId &&
        r.dest === data.dest &&
        (r.gateway || '') === (data.gateway || '') &&
        (r.iface || '') === (data.iface || '')
      ));
    });
    if (refreshTable && ns && dockerReady) await showRouteTable(ns);
    return true;
  }, [namespaces, dockerReady, execAndLog, update, showRouteTable]);

  const openIfaceModal = useCallback((vethId, end, ifaceName, nsName, currentIp, currentMac) => {
    setIfaceModal({ vethId, end, ifaceName, nsName, currentIp: currentIp || '', currentMac: currentMac || '', newIp: '', newMac: '' });
  }, []);

  const deleteIfaceIp = useCallback(async () => {
    if (!ifaceModal || !ifaceModal.currentIp) return;
    const { nsName, ifaceName, currentIp, vethId, end } = ifaceModal;
    if (dockerReady) {
      await execAndLog(`ip netns exec ${nsName} ip addr del ${currentIp} dev ${ifaceName}`);
    }
    update(s => {
      const v = s.veths.find(vv => vv.id === vethId);
      if (v) v[end].ip = "";
    });
    setIfaceModal(null);
  }, [ifaceModal, dockerReady, execAndLog, update]);

  const changeIface = useCallback(async () => {
    if (!ifaceModal) return;
    const { nsName, ifaceName, newIp, newMac, vethId, end } = ifaceModal;
    if (!validateCidr(newIp)) { alert(CIDR_ERROR_MSG); return; }
    if (newMac && dockerReady) {
      await execAndLog(`ip netns exec ${nsName} ip link set ${ifaceName} down`);
      await execAndLog(`ip netns exec ${nsName} ip link set dev ${ifaceName} address ${newMac}`);
      await execAndLog(`ip netns exec ${nsName} ip link set ${ifaceName} up`);
    }
    if (newIp && dockerReady) {
      if (ifaceModal.currentIp) {
        await execAndLog(`ip netns exec ${nsName} ip addr del ${ifaceModal.currentIp} dev ${ifaceName}`);
      }
      await execAndLog(`ip netns exec ${nsName} ip addr add ${newIp} dev ${ifaceName}`);
    }
    update(s => {
      const v = s.veths.find(vv => vv.id === vethId);
      if (!v) return;
      if (newMac) v[end].mac = newMac;
      if (newIp) v[end].ip = newIp;
    });
    setIfaceModal(null);
  }, [ifaceModal, dockerReady, execAndLog, update]);

  const deleteVlan = useCallback(async (id) => {
    const vl = vlans.find(v => v.id === id);
    if (dockerReady && vl) {
      const ns = namespaces.find(n => n.id === vl.nsId);
      if (ns) await execAndLog(`ip netns exec ${ns.name} ip link del ${vl.name}`);
    }
    update(s => { s.vlans = s.vlans.filter(v => v.id !== id); });
  }, [vlans, namespaces, dockerReady, execAndLog, update]);

  /* ── Save / Load ── */
  const saveTopology = useCallback(async () => {
    if (!isElectron()) return;
    const r = await saveFile({ ...state, ipForwardMap, iptablesMap });
    if (r.success) {
      addExecLog('save', `Saved to ${r.filePath}`);
      const name = r.filePath ? r.filePath.split(/[/\\]/).pop() : null;
      if (name) setCurrentFileName(name);
      setIsDirty(false);
    }
  }, [state, ipForwardMap, iptablesMap, addExecLog]);

  const loadTopology = useCallback(async () => {
    if (!isElectron()) return;
    const r = await loadFile();
    if (!r.success) return;
    await applyTopologyData(r.data);
    const name = r.filePath ? r.filePath.split(/[/\\]/).pop() : null;
    setCurrentFileName(name);
    setIsDirty(false);
  }, [applyTopologyData]);

  /* ── Drag ── */
  const onMouseDown = useCallback((e, nsId) => {
    e.stopPropagation();
    const ns = namespaces.find(n => n.id === nsId);
    setDragging({ nsId, ox: e.clientX / zoom - ns.x + pan.x / zoom, oy: e.clientY / zoom - ns.y + pan.y / zoom });
  }, [namespaces, zoom, pan]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = e => update(s => { const ns = s.namespaces.find(n => n.id === dragging.nsId); if (ns) { ns.x = e.clientX / zoom - dragging.ox + pan.x / zoom; ns.y = e.clientY / zoom - dragging.oy + pan.y / zoom; } });
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, update, zoom, pan]);

  /* ── Pan ── */
  const onBgMouseDown = useCallback(e => {
    if (e.target === svgRef.current || e.target.tagName === "rect") { setPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
  }, [pan]);

  useEffect(() => {
    if (!panning) return;
    const onMove = e => setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    const onUp = () => setPanning(false);
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [panning, panStart]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(2, Math.max(0.3, prevZoom - e.deltaY * 0.0015));
        setPan((prevPan) => {
          const wx = (cx - prevPan.x) / prevZoom;
          const wy = (cy - prevPan.y) / prevZoom;
          return {
            x: cx - wx * nextZoom,
            y: cy - wy * nextZoom,
          };
        });
        return nextZoom;
      });
      return;
    }

    setPan((prev) => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  }, []);

  /* ── Command generation ── */
  const generateCommands = useCallback(() => {
    const c = ["#!/bin/bash", "# === Network Namespace Setup ===", ""];
    namespaces.forEach(ns => c.push(`ip netns add ${ns.name}`));
    if (namespaces.length) c.push("");
    bridges.forEach(b => {
      const ns = namespaces.find(n => n.id === b.nsId); if (!ns) return;
      const p = `ip netns exec ${ns.name} `;
      c.push(`${p}ip link add ${b.name} type bridge`, `${p}ip link set ${b.name} up`);
      if (b.vlanFiltering) c.push(`${p}ip link set ${b.name} type bridge vlan_filtering 1`);
      if (b.ip) c.push(`${p}ip addr add ${b.ip} dev ${b.name}`);
      if (b.vlanFiltering) c.push(`${p}ip link set ${b.name} type bridge vlan_filtering 1`);
      c.push("");
    });
    veths.forEach(v => {
      c.push(`ip link add ${v.endA.name} type veth peer name ${v.endB.name}`);
      const nsA = namespaces.find(n => n.id === v.endA.nsId), nsB = namespaces.find(n => n.id === v.endB.nsId);
      if (nsA) c.push(`ip link set ${v.endA.name} netns ${nsA.name}`);
      if (nsB) c.push(`ip link set ${v.endB.name} netns ${nsB.name}`);
      const pA = nsA ? `ip netns exec ${nsA.name} ` : "", pB = nsB ? `ip netns exec ${nsB.name} ` : "";
      if (v.endA.bridge) { const br = bridges.find(b => b.id === v.endA.bridge); if (br) c.push(`${pA}ip link set ${v.endA.name} master ${br.name}`); }
      if (v.endA.mac) c.push(`${pA}ip link set dev ${v.endA.name} address ${v.endA.mac}`);
      if (v.endA.ip) c.push(`${pA}ip addr add ${v.endA.ip} dev ${v.endA.name}`);
      c.push(`${pA}ip link set ${v.endA.name} up`);
      if (v.endB.bridge) { const br = bridges.find(b => b.id === v.endB.bridge); if (br) c.push(`${pB}ip link set ${v.endB.name} master ${br.name}`); }
      if (v.endB.mac) c.push(`${pB}ip link set dev ${v.endB.name} address ${v.endB.mac}`);
      if (v.endB.ip) c.push(`${pB}ip addr add ${v.endB.ip} dev ${v.endB.name}`);
      c.push(`${pB}ip link set ${v.endB.name} up`, "");
    });
    if (vlans.length) {
      c.push("# --- VLANs ---");
      vlans.forEach(vl => {
        const ns = namespaces.find(n => n.id === vl.nsId); if (!ns) return;
        const p = `ip netns exec ${ns.name} `;
        c.push(`${p}ip link add link ${vl.name.replace(`.${vl.vlanId}`, '')} name ${vl.name} type vlan id ${vl.vlanId}`);
        c.push(`${p}ip link set ${vl.name} up`);
        if (vl.ip) c.push(`${p}ip addr add ${vl.ip} dev ${vl.name}`);
        c.push("");
      });
    }
    if (bridgeVlans.length) {
      c.push("# --- Bridge Port VLANs ---");
      bridgeVlans.forEach(bv => {
        const ns = namespaces.find(n => n.id === bv.nsId); if (!ns) return;
        let cmd = `ip netns exec ${ns.name} bridge vlan add dev ${bv.dev} vid ${bv.vid}`;
        if (bv.devType === 'self') cmd += ' self';
        if (bv.pvid) cmd += ' pvid';
        if (bv.untagged) cmd += ' untagged';
        c.push(cmd);
      });
      c.push("");
    }
    routes.forEach(r => {
      const ns = namespaces.find(n => n.id === r.nsId); if (!ns) return;
      const via = r.gateway ? ` via ${r.gateway}` : "";
      c.push(`ip netns exec ${ns.name} ip route add ${r.dest}${via}${r.iface ? ` dev ${r.iface}` : ""}`);
    });
    if (routes.length) c.push("");
    vlans.forEach(vl => {
      const ns = namespaces.find(n => n.id === vl.nsId); if (!ns) return;
      const p = `ip netns exec ${ns.name} `;
      c.push(`${p}ip link add link ${vl.name.split('.')[0]} name ${vl.name} type vlan id ${vl.vlanId}`);
      c.push(`${p}ip link set ${vl.name} up`);
      if (vl.ip) c.push(`${p}ip addr add ${vl.ip} dev ${vl.name}`);
    });
    if (vlans.length) c.push("");
    bridgeVlans.forEach(bv => {
      const ns = namespaces.find(n => n.id === bv.nsId); if (!ns) return;
      let cmd = `ip netns exec ${ns.name} bridge vlan add dev ${bv.dev} vid ${bv.vid}`;
      if (bv.devType === 'self') cmd += ' self';
      if (bv.pvid) cmd += ' pvid';
      if (bv.untagged) cmd += ' untagged';
      c.push(cmd);
    });
    if (commands.length) {
      c.push("", "# === Custom Commands ===");
      commands.forEach(cmd => {
        const ns = namespaces.find(n => n.id === cmd.nsId); if (!ns) return;
        cmd.cmds.split('\n').filter(l => l.trim()).forEach(line => {
          c.push(`ip netns exec ${ns.name} ${line.trim()}`);
        });
      });
    }
    setCmdLog(c); setShowCmd(true);
  }, [namespaces, bridges, veths, vlans, bridgeVlans, routes, commands]);

  /* ── Add operations ── */
  const addNs = () => { const i = namespaces.length; setModal({ type: "addNs", data: { name: `ns${i+1}` } }); };
  const addBridge = () => setModal({ type: "addBridge", data: { name: `br${bridges.length}`, nsId: namespaces[0]?.id||"", ip: "", vlanFiltering: true } });
  const addVeth = () => { const i = veths.length+1; setModal({ type: "addVeth", data: { name: `veth-pair-${i}`, endAName: `veth${i}a`, endANs: namespaces[0]?.id||"", endAIp: "", endAMac: "", endABridge: "", endBName: `veth${i}b`, endBNs: namespaces[1]?.id||namespaces[0]?.id||"", endBIp: "", endBMac: "", endBBridge: "" } }); };
  const addCommand = () => setModal({ type: "addCommand", data: { nsId: namespaces[0]?.id||"", cmds: "" } });

  const confirmModal = async () => {
    if (!modal) return;
    const { type, data } = modal;

    if (type === "addNs") {
      const nsId = uid();
      if (dockerReady) {
        const r = await execAndLog(`ip netns add ${data.name}`);
        if (!r.success) { alert(`Failed: ${r.output}`); return; }
        const fwRes = await execAndLog(`ip netns exec ${data.name} cat /proc/sys/net/ipv4/ip_forward`);
        if (fwRes.success) {
          const fwVal = (fwRes.output || '').trim() === '1';
          setIpForwardMap(prev => ({ ...prev, [nsId]: fwVal }));
        }
      }
      update(s => { const mx = s.namespaces.reduce((m,n) => Math.max(m,n.x), 0); s.namespaces.push({ id: nsId, name: data.name, x: s.namespaces.length === 0 ? 150 : mx + NS_W + 60, y: 200, isDefault: false }); });
    } else if (type === "addBridge") {
      if (!validateCidr(data.ip)) { alert(CIDR_ERROR_MSG); return; }
      const ns = namespaces.find(n => n.id === data.nsId);
      if (dockerReady && ns) {
        const p = `ip netns exec ${ns.name}`;
        let r = await execAndLog(`${p} ip link add ${data.name} type bridge`); if (!r.success) { alert(`Failed: ${r.output}`); return; }
        await execAndLog(`${p} ip link set ${data.name} up`);
        if (data.ip) await execAndLog(`${p} ip addr add ${data.ip} dev ${data.name}`);
        if (data.vlanFiltering) await execAndLog(`${p} ip link set ${data.name} type bridge vlan_filtering 1`);
      }
      update(s => s.bridges.push({ id: uid(), name: data.name, nsId: data.nsId, ip: data.ip, vlanFiltering: !!data.vlanFiltering }));
    } else if (type === "addVeth") {
      if (!validateCidr(data.endAIp) || !validateCidr(data.endBIp)) { alert(CIDR_ERROR_MSG); return; }
      if (dockerReady) {
        const nsA = namespaces.find(n => n.id === data.endANs), nsB = namespaces.find(n => n.id === data.endBNs);
        let r = await execAndLog(`ip link add ${data.endAName} type veth peer name ${data.endBName}`); if (!r.success) { alert(`Failed: ${r.output}`); return; }
        if (nsA) await execAndLog(`ip link set ${data.endAName} netns ${nsA.name}`);
        if (nsB) await execAndLog(`ip link set ${data.endBName} netns ${nsB.name}`);
        const pA = nsA ? `ip netns exec ${nsA.name}` : "", pB = nsB ? `ip netns exec ${nsB.name}` : "";
        if (data.endABridge) { const br = bridges.find(b => b.id === data.endABridge); if (br) await execAndLog(`${pA} ip link set ${data.endAName} master ${br.name}`); }
        if (data.endBBridge) { const br = bridges.find(b => b.id === data.endBBridge); if (br) await execAndLog(`${pB} ip link set ${data.endBName} master ${br.name}`); }
        if (data.endAIp) await execAndLog(`${pA} ip addr add ${data.endAIp} dev ${data.endAName}`);
        if (data.endBIp) await execAndLog(`${pB} ip addr add ${data.endBIp} dev ${data.endBName}`);
        if (data.endAMac) await execAndLog(`${pA} ip link set dev ${data.endAName} address ${data.endAMac}`);
        if (data.endBMac) await execAndLog(`${pB} ip link set dev ${data.endBName} address ${data.endBMac}`);
        await execAndLog(`${pA} ip link set ${data.endAName} up`);
        await execAndLog(`${pB} ip link set ${data.endBName} up`);
      }
      update(s => s.veths.push({ id: uid(), name: data.name,
        endA: { id: uid(), name: data.endAName, nsId: data.endANs, ip: data.endAIp, mac: data.endAMac||null, bridge: data.endABridge||null },
        endB: { id: uid(), name: data.endBName, nsId: data.endBNs, ip: data.endBIp, mac: data.endBMac||null, bridge: data.endBBridge||null },
        swapped: false
      }));
    } else if (type === "addRoute") {
      const ok = await addRouteRule(data);
      if (!ok) return;
    } else if (type === "addCommand") {
      const ns = namespaces.find(n => n.id === data.nsId);
      if (dockerReady && ns) {
        const lines = data.cmds.split('\n').filter(l => l.trim());
        for (const line of lines) {
          await execAndLog(`ip netns exec ${ns.name} ${line.trim()}`);
        }
      }
      update(s => s.commands.push({ id: uid(), nsId: data.nsId, cmds: data.cmds }));
    }
    // Fetch actual MACs from Docker (addVeth only)
      if (type === "addVeth" && dockerReady) {
        setTimeout(async () => {
          const nsA = namespaces.find(n => n.id === data.endANs);
          const nsB = namespaces.find(n => n.id === data.endBNs);
          const updates = {};
          if (nsA) {
            const r = await dockerExec(`ip netns exec ${nsA.name} cat /sys/class/net/${data.endAName}/address 2>/dev/null`);
            if (r.success && r.output.trim()) updates.macA = r.output.trim();
          }
          if (nsB) {
            const r = await dockerExec(`ip netns exec ${nsB.name} cat /sys/class/net/${data.endBName}/address 2>/dev/null`);
            if (r.success && r.output.trim()) updates.macB = r.output.trim();
          }
          if (updates.macA || updates.macB) {
            setState(prev => {
              const next = JSON.parse(JSON.stringify(prev));
              const veth = next.veths[next.veths.length - 1];
              if (veth) {
                if (updates.macA && !veth.endA.mac) veth.endA.mac = updates.macA;
                if (updates.macB && !veth.endB.mac) veth.endB.mac = updates.macB;
              }
              return next;
            });
          }
        }, 800);
      }
    setModal(null);
  };

  /* ── Delete operations ── */
  const deleteNs = async (id) => {
    const ns = namespaces.find(n => n.id === id);
    if (dockerReady && ns) await execAndLog(`ip netns del ${ns.name}`);
    update(s => {
      s.namespaces = s.namespaces.filter(n => n.id !== id);
      s.bridges = s.bridges.filter(b => b.nsId !== id);
      s.veths = s.veths.filter(v => v.endA.nsId !== id && v.endB.nsId !== id);
      s.vlans = s.vlans.filter(vl => vl.nsId !== id);
      s.routes = s.routes.filter(r => r.nsId !== id);
      s.bridgeVlans = s.bridgeVlans.filter(bv => bv.nsId !== id);
      s.commands = s.commands.filter(c => c.nsId !== id);
    });
    // 該当nsのターミナルを全部閉じる
    setTerminalTabs(prev => {
      const next = prev.filter(t => t.nsId !== id);
      if (!next.find(t => t.tabId === activeTermTab)) setActiveTermTab(next.length ? next[next.length - 1].tabId : '__log__');
      return next;
    });
    setSelected(null);
  };

  const deleteBridge = async (id) => {
    const br = bridges.find(b => b.id === id);
    if (dockerReady && br) { const ns = namespaces.find(n => n.id === br.nsId); if (ns) await execAndLog(`ip netns exec ${ns.name} ip link del ${br.name}`); }
    update(s => { s.bridges = s.bridges.filter(b => b.id !== id); s.veths.forEach(v => { if (v.endA.bridge === id) v.endA.bridge = null; if (v.endB.bridge === id) v.endB.bridge = null; }); s.vlans = s.vlans.filter(vl => !(vl.parentType === 'bridge' && vl.parentId === id)); s.bridgeVlans = (s.bridgeVlans || []).filter(bv => bv.bridgeId !== id); });
  };

  const deleteVeth = async (id) => {
    const v = veths.find(vv => vv.id === id);
    if (dockerReady && v) { const ns = namespaces.find(n => n.id === v.endA.nsId); if (ns) await execAndLog(`ip netns exec ${ns.name} ip link del ${v.endA.name}`); }
    update(s => { s.veths = s.veths.filter(v => v.id !== id); s.vlans = s.vlans.filter(vl => !(vl.parentType === 'veth' && vl.parentId === id)); s.bridgeVlans = (s.bridgeVlans || []).filter(bv => bv.vethId !== id); });
  };

  const deleteCommand = (id) => update(s => { s.commands = s.commands.filter(c => c.id !== id); });


  const resetAll = async () => {
    if (dockerReady) for (const ns of namespaces) await execAndLog(`ip netns del ${ns.name}`);
    setState(defaultState()); setSelected(null); setTerminalTabs([]); setActiveTermTab(null); setShowTerminal(false); setExecLog([]);
    setCurrentFileName(null); setIsDirty(false);
  };

  const ifacePos = getInterfacePositions(namespaces, bridges, veths, vlans, ipForwardMap);
  const nsOptions = namespaces.map(n => ({ value: n.id, label: n.name }));
  const bridgeOptions = nsId => [{ value: "", label: "(none)" }, ...bridges.filter(b => b.nsId === nsId).map(b => ({ value: b.id, label: b.name }))];

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div style={{ width: "100vw", height: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', system-ui, sans-serif", color: COLORS.text, overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${COLORS.bg}}::-webkit-scrollbar-thumb{background:${COLORS.border};border-radius:3px}.inspector-scroll{scrollbar-color:${TOKENS.surfaceHi} transparent;scrollbar-width:thin}.inspector-scroll::-webkit-scrollbar{width:8px;height:8px}.inspector-scroll::-webkit-scrollbar-track{background:transparent}.inspector-scroll::-webkit-scrollbar-thumb{background:${TOKENS.surfaceHi};border-radius:4px}.inspector-scroll::-webkit-scrollbar-thumb:hover{background:#2e2e38}`}</style>

      {/* ── Top Bar (Row 1) ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: `1px solid ${TOKENS.line}`, background: TOKENS.bg2, flexShrink: 0 }}>
        {/* Logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${TOKENS.indigo}, ${TOKENS.magenta})` }} />
          <span style={{ fontFamily: TOKENS.fontMono, fontWeight: 700, fontSize: 14, color: TOKENS.text }}>netns-viz</span>
        </div>

        {/* Breadcrumb */}
        <span style={{ color: TOKENS.textFaint, fontSize: 12 }}>›</span>
        <span style={{ fontFamily: TOKENS.fontMono, fontSize: 12, color: currentFileName ? TOKENS.text : TOKENS.textDim }}>
          {currentFileName || '無題'}{isDirty && <span style={{ color: TOKENS.amber, marginLeft: 4 }}>*</span>}
        </span>

        <div style={{ flex: 1 }} />

        {/* Docker status */}
        {isElectron() && (
          !dockerReady
            ? <button onClick={startDocker} disabled={dockerLoading} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 11,
                fontFamily: TOKENS.fontMono, fontWeight: 500,
                background: TOKENS.surface, color: TOKENS.textMid,
                border: `1px solid ${TOKENS.line}`, borderRadius: 6, cursor: dockerLoading ? "wait" : "pointer",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.textDim }} />
                {dockerLoading ? "起動中..." : "Docker 未接続"}
              </button>
            : <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 11,
                fontFamily: TOKENS.fontMono, fontWeight: 500, color: TOKENS.green,
                background: TOKENS.greenSoft, border: `1px solid ${TOKENS.green}30`, borderRadius: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: TOKENS.green }} />
                Docker 接続中
              </div>
        )}

        {/* Host Terminal */}
        {isElectron() && (
          <button onClick={openHostTerminal} disabled={!dockerReady} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", fontSize: 11,
            fontFamily: TOKENS.fontMono, fontWeight: 500,
            background: TOKENS.surface, color: TOKENS.textMid,
            border: `1px solid ${TOKENS.line}`, borderRadius: 6,
            cursor: dockerReady ? "pointer" : "not-allowed", opacity: dockerReady ? 1 : 0.4,
          }}>
            <span style={{ fontWeight: 600 }}>&gt;_</span>
            <span>ターミナル（Linuxホスト）</span>
          </button>
        )}

        {/* Generate Commands */}
        <button onClick={generateCommands} disabled={!namespaces.length} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", fontSize: 11,
          fontFamily: TOKENS.fontMono, fontWeight: 500,
          background: TOKENS.surface, color: TOKENS.textMid,
          border: `1px solid ${TOKENS.line}`, borderRadius: 6,
          cursor: namespaces.length ? "pointer" : "not-allowed", opacity: namespaces.length ? 1 : 0.4,
        }}>
          <Icon d={Icons.terminal} size={12} color={TOKENS.textDim} />
          コマンド生成
        </button>
      </div>

      {/* ── Action Bar (Row 2) ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderBottom: `1px solid ${TOKENS.line}`, background: TOKENS.bg, flexShrink: 0 }}>
        {/* Create actions */}
        <button onClick={addNs} disabled={isElectron() && !dockerReady} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11,
          fontFamily: TOKENS.fontMono, fontWeight: 500,
          background: "transparent", color: TOKENS.textMid,
          border: "none", borderRadius: 5,
          cursor: (isElectron() && !dockerReady) ? "not-allowed" : "pointer",
          opacity: (isElectron() && !dockerReady) ? 0.4 : 1,
        }}>
          <Icon d={Icons.plus} size={11} color={TOKENS.text} />
          Namespace
        </button>
        <button onClick={addBridge} disabled={!namespaces.length} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11,
          fontFamily: TOKENS.fontMono, fontWeight: 500,
          background: "transparent", color: TOKENS.textMid,
          border: "none", borderRadius: 5,
          cursor: namespaces.length ? "pointer" : "not-allowed", opacity: namespaces.length ? 1 : 0.4,
        }}>
          <Icon d={Icons.plus} size={11} color={TOKENS.text} />
          ブリッジ
        </button>
        <button onClick={addVeth} disabled={!namespaces.length} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11,
          fontFamily: TOKENS.fontMono, fontWeight: 500,
          background: "transparent", color: TOKENS.textMid,
          border: "none", borderRadius: 5,
          cursor: namespaces.length ? "pointer" : "not-allowed", opacity: namespaces.length ? 1 : 0.4,
        }}>
          <Icon d={Icons.plus} size={11} color={TOKENS.text} />
          veth ペア
        </button>
        <button onClick={addCommand} disabled={!namespaces.length} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11,
          fontFamily: TOKENS.fontMono, fontWeight: 500,
          background: "transparent", color: TOKENS.textMid,
          border: "none", borderRadius: 5,
          cursor: namespaces.length ? "pointer" : "not-allowed", opacity: namespaces.length ? 1 : 0.4,
        }}>
          <Icon d={Icons.plus} size={11} color={TOKENS.text} />
          カスタムコマンド
        </button>

        <div style={{ flex: 1 }} />

        {/* File ops */}
        {isElectron() && (<>
          <button onClick={saveTopology} disabled={!namespaces.length} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11,
            fontFamily: TOKENS.fontMono, fontWeight: 500,
            background: "transparent", color: TOKENS.textMid,
            border: "none", borderRadius: 5,
            cursor: namespaces.length ? "pointer" : "not-allowed", opacity: namespaces.length ? 1 : 0.4,
          }}>
            <Icon d={Icons.save} size={11} color={TOKENS.textDim} />
            保存
          </button>
          <button onClick={loadTopology} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11,
            fontFamily: TOKENS.fontMono, fontWeight: 500,
            background: "transparent", color: TOKENS.textMid,
            border: "none", borderRadius: 5, cursor: "pointer",
          }}>
            <Icon d={Icons.folder} size={11} color={TOKENS.textDim} />
            読込
          </button>
        </>)}
        <button onClick={() => {
          if (showTerminal && activeTermTab === '__log__') setShowTerminal(false);
          else { setShowTerminal(true); setActiveTermTab('__log__'); }
        }} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11,
          fontFamily: TOKENS.fontMono, fontWeight: 500,
          background: showTerminal && activeTermTab === '__log__' ? TOKENS.surface : "transparent",
          color: TOKENS.textMid, border: "none", borderRadius: 5, cursor: "pointer",
        }}>
          <Icon d={Icons.code} size={11} color={TOKENS.textDim} />
          ログ
        </button>
        <button onClick={resetAll} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11,
          fontFamily: TOKENS.fontMono, fontWeight: 500,
          background: "transparent", color: TOKENS.textMid,
          border: "none", borderRadius: 5, cursor: "pointer",
        }}>
          <Icon d={Icons.x} size={11} color={TOKENS.textDim} />
          リセット
        </button>
        <div style={{ width: 1, height: 18, background: TOKENS.line, margin: "0 4px" }} />
        <div style={{ fontSize: 11, color: TOKENS.textDim, fontFamily: TOKENS.fontMono, padding: "0 4px" }}>{Math.round(zoom * 100)}%</div>
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ flex: dockMaximized && showTerminal ? 0 : 1, display: dockMaximized && showTerminal ? "none" : "flex", overflow: "hidden" }}>

          {/* ── Canvas ── */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <Canvas svgRef={svgRef} panning={panning} onMouseDown={e => { setVethCtxMenu(null); onBgMouseDown(e); }} onWheel={onWheel} zoom={zoom} pan={pan}>
                {/* Veth lines */}
                {veths.map(v => {
                  const pA = ifacePos[v.endA.id], pB = ifacePos[v.endB.id];
                  if (!pA || !pB) return null;
                  const cp1x = pA.side === "right" ? pA.x+80 : pA.x-80;
                  const cp2x = pB.side === "left" ? pB.x-80 : pB.x+80;
                  return (
                    <VethEdge key={v.id} v={v} pA={pA} pB={pB} cp1x={cp1x} cp2x={cp2x} setVethCtxMenu={setVethCtxMenu} />
                  );
                })}

                {/* Namespace boxes */}
                {namespaces.map(ns => (
                  <NamespaceNode
                    key={ns.id}
                    ns={ns}
                    selected={selected}
                    onMouseDown={onMouseDown}
                    setSelected={setSelected}
                    dockerReady={dockerReady}
                    bridges={bridges}
                    veths={veths}
                    vlans={vlans}
                    namespaces={namespaces}
                    bridgeVlans={bridgeVlans}
                    ipForwardMap={ipForwardMap}
                    iptablesMap={iptablesMap}
                    showVlanSubIface={showVlanSubIface}
                    showMacTable={showMacTable}
                    showArpTable={showArpTable}
                    showRouteTable={showRouteTable}
                    toggleIpForward={toggleIpForward}
                    showIptables={showIptables}
                    openTerminal={openTerminal}
                    deleteNs={deleteNs}
                    toggleBridgeVlanFiltering={toggleBridgeVlanFiltering}
                    deleteBridge={deleteBridge}
                    openIfaceModal={openIfaceModal}
                    openBridgeVlanModal={openBridgeVlanModal}
                    openVlanModal={openVlanModal}
                    deleteVeth={deleteVeth}
                    deleteVlan={deleteVlan}
                  />
                ))}

                {!namespaces.length && (
                  <text x={300} y={200} textAnchor="middle" fontSize={14} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">
                    {dockerReady ? "「+ Namespace」で始めましょう" : isElectron() ? "まず「🐳 Docker起動」をクリック" : "Electronで起動するとDockerと連携できます"}
                  </text>
                )}
            </Canvas>

            {/* Veth context menu */}
            {vethCtxMenu && (
              <div style={{ position: "fixed", left: vethCtxMenu.x, top: vethCtxMenu.y, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 4, zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                onClick={() => setVethCtxMenu(null)}>
                <div style={{ padding: "6px 16px", cursor: "pointer", fontSize: 12, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", borderRadius: 4 }}
                  onMouseEnter={e => e.currentTarget.style.background = COLORS.border}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => swapVethEnds(vethCtxMenu.vethId)}>
                  接続線の左右を入れ替え
                </div>
              </div>
            )}

            {/*<div style={{ position: "absolute", bottom: 16, right: 16, fontSize: 10, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", background: COLORS.surface+"cc", padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
              ドラッグ: ノード移動 · 背景ドラッグ: パン · スクロール: ズーム
            </div>*/}
          </div>

          </div>

          {/* ── Bottom Dock (実行ログ + ターミナル統合) ── */}
          {showTerminal && (
            <div style={{ height: dockMaximized ? "100%" : dockHeight, flex: dockMaximized ? 1 : "none", borderTop: `1px solid ${TOKENS.line}`, background: TOKENS.surface, display: "flex", flexDirection: "column", flexShrink: 0, position: "relative" }}>
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="ボトムウィンドウの高さ"
              tabIndex={dockMaximized ? -1 : 0}
              onMouseDown={startDockResize}
              onDoubleClick={() => setDockHeight(DOCK_DEFAULT_HEIGHT)}
              onKeyDown={(e) => {
                if (dockMaximized) return;
                if (e.key === "ArrowUp") { e.preventDefault(); adjustDockHeight(16); }
                if (e.key === "ArrowDown") { e.preventDefault(); adjustDockHeight(-16); }
                if (e.key === "Home") { e.preventDefault(); setDockHeight(DOCK_MIN_HEIGHT); }
                if (e.key === "End") { e.preventDefault(); setDockHeight(clampDockHeight(window.innerHeight)); }
              }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: -4,
                height: 8,
                cursor: dockMaximized ? "default" : "ns-resize",
                zIndex: 3,
                outline: "none",
              }}
            >
              <div style={{
                position: "absolute",
                left: "50%",
                top: 3,
                width: 36,
                height: 2,
                transform: "translateX(-50%)",
                borderRadius: 1,
                background: dockResizing ? TOKENS.indigo : TOKENS.line,
              }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: `1px solid ${TOKENS.line}`, background: TOKENS.bg2, flexShrink: 0, overflow: "auto" }}>
              {/* 実行ログタブ（常駐） */}
              <div onClick={() => setActiveTermTab('__log__')}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 11, fontFamily: TOKENS.fontMono,
                  cursor: "pointer", fontWeight: activeTermTab === '__log__' ? 600 : 500,
                  color: activeTermTab === '__log__' ? TOKENS.text : TOKENS.textMid,
                  background: activeTermTab === '__log__' ? TOKENS.surface : "transparent",
                  borderTop: activeTermTab === '__log__' ? `2px solid ${TOKENS.indigo}` : "2px solid transparent",
                  borderRight: `1px solid ${TOKENS.line}`,
                  whiteSpace: "nowrap", flexShrink: 0 }}>
                <Icon d={Icons.code} size={11} color={activeTermTab === '__log__' ? TOKENS.text : TOKENS.textMid} />
                実行ログ
              </div>
              {/* ターミナルタブ */}
              {terminalTabs.map(tab => (
                <div key={tab.tabId} onClick={() => setActiveTermTab(tab.tabId)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 11, fontFamily: TOKENS.fontMono,
                    cursor: "pointer", fontWeight: activeTermTab === tab.tabId ? 600 : 500,
                    color: activeTermTab === tab.tabId ? TOKENS.text : TOKENS.textMid,
                    background: activeTermTab === tab.tabId ? TOKENS.surface : "transparent",
                    borderTop: activeTermTab === tab.tabId ? `2px solid ${tab.color}` : "2px solid transparent",
                    borderRight: `1px solid ${TOKENS.line}`,
                    whiteSpace: "nowrap", flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: tab.color, display: "inline-block" }} />
                  {tab.label}
                  <span onClick={e => { e.stopPropagation(); closeTermTab(tab.tabId); }} style={{ color: TOKENS.textDim, fontSize: 10, marginLeft: 4, cursor: "pointer" }}>✕</span>
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 2, paddingLeft: 8, borderLeft: `1px solid ${TOKENS.line}`, marginRight: 8 }}>
                <button onClick={() => setDockMaximized(m => !m)} title={dockMaximized ? "元のサイズへ" : "最大化"}
                  style={{ width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", color: TOKENS.textDim, background: "transparent", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  {dockMaximized
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4v6H4"/><path d="M14 20v-6h6"/><path d="M14 10l6-6"/><path d="M4 20l6-6"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v6h6"/><path d="M20 10V4h-6"/><path d="M14 4l6 6"/><path d="M4 20l6-6"/></svg>}
                </button>
                <button onClick={() => { setShowTerminal(false); setDockMaximized(false); }} title="最小化"
                  style={{ width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", color: TOKENS.textDim, background: "transparent", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              {/* ログペイン */}
              {activeTermTab === '__log__' && (
                <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", borderBottom: `1px solid ${TOKENS.lineSoft}`, fontSize: 10, fontFamily: TOKENS.fontMono, color: TOKENS.textFaint, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                    <span style={{ width: 60 }}>TIME</span>
                    <span style={{ width: 38 }}>STATUS</span>
                    <span style={{ flex: 1 }}>COMMAND</span>
                    <Btn small ghost onClick={() => setExecLog([])}>Clear</Btn>
                  </div>
                  <div style={{ flex: 1, overflow: "auto", padding: '4px 0' }}>
                    {!execLog.length && <div style={{ color: TOKENS.textDim, fontSize: 11, fontFamily: TOKENS.fontMono, padding: '8px 14px' }}>GUIの操作ログがここに表示されます</div>}
                    {execLog.map((e, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5px 14px', fontFamily: TOKENS.fontMono, fontSize: 11.5, lineHeight: 1.55 }}>
                        <span style={{ color: TOKENS.textDim, width: 60, flexShrink: 0, fontSize: 11 }}>{e.time}</span>
                        <span style={{ width: 38, flexShrink: 0 }}>
                          <span style={{ padding: '1px 5px', fontSize: 9.5, fontFamily: TOKENS.fontMono, fontWeight: 600, letterSpacing: '0.05em', borderRadius: 3,
                            color: e.success ? TOKENS.green : TOKENS.red,
                            background: e.success ? TOKENS.greenSoft : TOKENS.redSoft,
                          }}>{e.success ? 'OK' : 'ERR'}</span>
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: e.success ? TOKENS.text : TOKENS.textMid }}>
                            <span style={{ color: TOKENS.textDim, marginRight: 6 }}>$</span>
                            {e.cmd}
                          </span>
                          {e.output && <div style={{ color: e.success ? TOKENS.textDim : TOKENS.red, fontSize: 11, marginTop: 2 }}>↳ {e.output}</div>}
                        </div>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              )}
              {/* ターミナルペイン */}
              {terminalTabs.map(tab => (
                <div key={tab.tabId} style={{ display: activeTermTab === tab.tabId ? "flex" : "none", height: "100%", flexDirection: "column" }}>
                  {tab.kind === 'host'
                    ? <HostTerminal tabId={tab.tabId} dockerReady={dockerReady} isElectron={isElectron} openShell={openShell} closeShell={closeShell} sendCommand={sendCommand} killSession={killSession} writeSession={writeSession} onShellData={onShellData} />
                    : <NsTerminal tabId={tab.tabId} ns={{ id: tab.nsId, name: tab.nsName, color: tab.color, role: tab.role }} dockerReady={dockerReady} isElectron={isElectron} openShell={openShell} closeShell={closeShell} sendCommand={sendCommand} killSession={killSession} writeSession={writeSession} onShellData={onShellData} />}
                </div>
              ))}
            </div>
            </div>
          )}

          {/* ── Minimized Dock Bar ── */}
          {!showTerminal && (
            <div style={{ height: 28, display: "flex", alignItems: "center", padding: "0 8px", background: TOKENS.bg2, borderTop: `1px solid ${TOKENS.line}`, gap: 4, flexShrink: 0 }}>
              <button onClick={() => { setShowTerminal(true); setActiveTermTab('__log__'); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", height: 20, fontFamily: TOKENS.fontMono, fontSize: 10.5, color: TOKENS.textMid, background: "transparent", border: "none", cursor: "pointer", borderRadius: 3 }}>
                <Icon d={Icons.code} size={11} color={TOKENS.textDim} />
                実行ログ
              </button>
              {terminalTabs.map(t => (
                <button key={t.tabId} onClick={() => { setShowTerminal(true); setActiveTermTab(t.tabId); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", height: 20, fontFamily: TOKENS.fontMono, fontSize: 10.5, color: TOKENS.textMid, background: "transparent", border: "none", cursor: "pointer", borderRadius: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 3, background: t.color, display: "inline-block" }} />
                  {t.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowTerminal(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", height: 20, fontFamily: TOKENS.fontMono, fontSize: 10.5, color: TOKENS.textMid, background: "transparent", border: "none", cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"/></svg>
                開く
              </button>
            </div>
          )}
        </div>

        {/* ── Inspector Panel ── */}
        {selected && (
          <Inspector
            ns={namespaces.find(n => n.id === selected)}
            bridges={bridges}
            veths={veths}
            vlans={vlans}
            bridgeVlans={bridgeVlans}
            namespaces={namespaces}
            ipForwardMap={ipForwardMap}
            dockerReady={dockerReady}
            onClose={() => setSelected(null)}
            onDeleteNs={deleteNs}
            onDeleteVeth={deleteVeth}
            onEditIface={openIfaceModal}
            onToggleIpForward={toggleIpForward}
            onOpenTerminal={openTerminal}
            onShowRouteTable={showRouteTable}
            onShowArpTable={showArpTable}
            onShowMacTable={showMacTable}
            onShowIptables={showIptables}
            onOpenBridgeVlanModal={openBridgeVlanModal}
            onOpenVlanModal={openVlanModal}
            onDeleteVlan={deleteVlan}
            onToggleBridgeVlanFiltering={toggleBridgeVlanFiltering}
          />
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === "addNs" && (
        <NsAddModal
          data={modal.data}
          setData={d => setModal({ ...modal, data: d })}
          onCancel={() => setModal(null)}
          onConfirm={confirmModal}
        />
      )}

      {modal?.type === "addBridge" && (
        <BridgeAddModal
          data={modal.data}
          setData={d => setModal({ ...modal, data: d })}
          onCancel={() => setModal(null)}
          onConfirm={confirmModal}
          namespaces={namespaces}
        />
      )}

      {modal?.type === "addVeth" && (
        <VethAddModal
          data={modal.data}
          setData={d => setModal({ ...modal, data: d })}
          onCancel={() => setModal(null)}
          onConfirm={confirmModal}
          namespaces={namespaces}
          bridges={bridges}
          bridgeOptions={bridgeOptions}
        />
      )}

      {modal?.type === "addCommand" && (
        <CommandAddModal
          data={modal.data}
          setData={d => setModal({ ...modal, data: d })}
          onCancel={() => setModal(null)}
          onConfirm={confirmModal}
          namespaces={namespaces}
        />
      )}

      {routeModal && (
        <RouteModal routeModal={routeModal} setRouteModal={setRouteModal} showRouteTable={showRouteTable} addRouteRule={addRouteRule} deleteRouteRule={deleteRouteRule} />
      )}

      {macTableModal && (
        <MacTableModal macTableModal={macTableModal} setMacTableModal={setMacTableModal}
          showMacTable={showMacTable} showAll={macTableShowAll} setShowAll={setMacTableShowAll} />
      )}

      {arpTableModal && (
        <ArpModal arpModal={arpTableModal} setArpModal={setArpTableModal} showArpTable={showArpTable} />
      )}

      {iptablesModal && (
        <IptablesModal iptablesModal={iptablesModal} setIptablesModal={setIptablesModal} iptablesMap={iptablesMap} deleteIptablesRule={deleteIptablesRule} addIptablesRule={addIptablesRule} />
      )}

      {ifaceModal && (
        <IfaceModal ifaceModal={ifaceModal} setIfaceModal={setIfaceModal} deleteIfaceIp={deleteIfaceIp} changeIface={changeIface} />
      )}

      {/* ── Bridge VLAN Modal ── */}
      {bridgeVlanModal && (
        <BridgeVlanModal bridgeVlanModal={bridgeVlanModal} setBridgeVlanModal={setBridgeVlanModal} bridgeVlans={bridgeVlans} deleteBridgeVlan={deleteBridgeVlan} applyPortMode={applyPortMode} />
      )}

      {/* ── Endpoint VLAN Modal ── */}
      {vlanModal && (
        <VlanModal vlanModal={vlanModal} setVlanModal={setVlanModal} vlans={vlans} confirmVlan={confirmVlan} />
      )}

      {showCmd && (
        <Modal
          title="生成されたコマンド"
          onClose={() => setShowCmd(false)}
          width={640}
          {...tableModalStyles}
          headerIcon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4 7 5 5-5 5" />
              <path d="M12 17h8" />
            </svg>
          }
          headerColor={NAVY.cyan}
          footer={
            <>
              <NavyButton
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                  </svg>
                }
                onClick={() => navigator.clipboard?.writeText(cmdLog.join("\n"))}
              >
                コピー
              </NavyButton>
              <div style={{ flex: 1 }} />
              <NavyButton onClick={() => setShowCmd(false)}>閉じる</NavyButton>
            </>
          }
        >
          <pre className="inspector-scroll" style={{
            background: NAVY.bg,
            color: NAVY.textMid,
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: TOKENS.fontMono,
            lineHeight: 1.7,
            overflow: "auto",
            maxHeight: 400,
            border: `1px solid ${NAVY.line}`,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
          }}>
            {cmdLog.join("\n")}
          </pre>
          {commands.length > 0 && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${NAVY.line}`, paddingTop: 12 }}>
              <div style={{
                fontSize: 10,
                color: NAVY.textDim,
                marginBottom: 8,
                fontFamily: TOKENS.fontMono,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                カスタムコマンド
              </div>
              {commands.map(cmd => {
                const ns = namespaces.find(n => n.id === cmd.nsId);
                return (
                  <div key={cmd.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                    padding: "6px 9px",
                    background: NAVY.bg,
                    border: `1px solid ${NAVY.lineSoft}`,
                    borderRadius: 5,
                    fontSize: 11,
                    fontFamily: TOKENS.fontMono,
                  }}>
                    <span style={{ color: ns?.color, fontWeight: 700, flexShrink: 0 }}>{ns?.name || "?"}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: NAVY.textMid }}>
                      {cmd.cmds.split('\n').filter(l => l.trim()).join('; ')}
                    </span>
                    <span onClick={() => deleteCommand(cmd.id)} style={{ cursor: "pointer", color: TOKENS.red, opacity: 0.75, fontSize: 10 }}>✕</span>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
