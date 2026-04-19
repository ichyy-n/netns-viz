import { useState, useCallback, useRef, useEffect } from "react";
import { COLORS, NS_COLORS, NS_W, NS_HEADER, NS_ITEM_H } from "./theme.js";
import { uid } from "./logic/ids.js";
import { CHAIN_OPTIONS } from "./logic/constants.js";
import { validateCidr, CIDR_ERROR_MSG } from "./logic/validation.js";
import { getNsHeight, getInterfacePositions } from "./logic/topology.js";
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
import { IfaceModal } from "./ui/modals/IfaceModal.jsx";
import { VlanModal } from "./ui/modals/VlanModal.jsx";
import { BridgeVlanModal } from "./ui/modals/BridgeVlanModal.jsx";

/* ── Per-Namespace Terminal ── */
const NsTerminal = ({ tabId, ns, dockerReady }) => {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const sessionIdRef = useRef(`${tabId}-shell`);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  // 永続シェルを開く
  useEffect(() => {
    if (!isElectron() || !window.electronAPI.docker.openShell || !dockerReady) return;
    const sid = sessionIdRef.current;
    const shellCmd = `ip netns exec ${ns.name} bash`;
    openShell(sid, shellCmd);
    setShellReady(true);
    return () => { closeShell(sid); };
  }, [dockerReady, ns.name]);

  // ストリームデータ受信
  useEffect(() => {
    if (!isElectron() || !window.electronAPI.stream) return;
    const cleanup = onShellData((sid, data) => {
      if (sid !== sessionIdRef.current) return;

      if (data.includes('__SHELL_EXIT__')) {
        setRunning(false);
        setShellReady(false);
        const clean = data.replace('__SHELL_EXIT__', '').trim();
        if (clean) setHistory(prev => [...prev, { type: "ok", text: clean }]);
        setHistory(prev => [...prev, { type: "err", text: "[shell exited]" }]);
      } else if (data.includes('__CMD_DONE__')) {
        setRunning(false);
        const clean = data.replace('\n__CMD_DONE__', '').replace('__CMD_DONE__', '').trim();
        if (clean) setHistory(prev => [...prev, { type: "ok", text: clean }]);
      } else {
        setHistory(prev => {
          const last = prev[prev.length - 1];
          if (last && last.type === "stream") {
            const updated = [...prev];
            updated[updated.length - 1] = { type: "stream", text: last.text + data };
            return updated;
          }
          return [...prev, { type: "stream", text: data }];
        });
      }
    });
    return cleanup;
  }, []);

  const runCmd = async () => {
    const cmd = input.trim();
    if (!cmd || !dockerReady || !shellReady || running) return;
    setInput(""); setCmdHistory(prev => [...prev, cmd]); setHistoryIdx(-1);
    setHistory(prev => [...prev, { type: "cmd", text: cmd }]);
    setRunning(true);

    try {
      await sendCommand(sessionIdRef.current, cmd);
    } catch (e) {
      setHistory(prev => [...prev, { type: "err", text: e.message }]);
      setRunning(false);
    }
    inputRef.current?.focus();
  };

  const killCmd = async () => {
    await killSession(sessionIdRef.current);
    setHistory(prev => [...prev, { type: "err", text: "^C" }]);
    setRunning(false);
  };

  const sendStdin = async () => {
    if (!shellReady) return;
    const text = input;
    setInput("");
    if (text) {
      setCmdHistory(prev => [...prev, text]);
      setHistory(prev => [...prev, { type: "stdin", text }]);
    }
    await writeSession(sessionIdRef.current, `${text}\n`);
  };

  const onKeyDown = (e) => {
    if (e.key === "c" && e.ctrlKey && running) { e.preventDefault(); killCmd(); return; }
    if (e.key === "Enter") { e.preventDefault(); if (running) sendStdin(); else runCmd(); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!cmdHistory.length) return;
      const i = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(i); setInput(cmdHistory[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      const i = historyIdx + 1;
      if (i >= cmdHistory.length) { setHistoryIdx(-1); setInput(""); }
      else { setHistoryIdx(i); setInput(cmdHistory[i]); }
    } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setHistory([]); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }} onClick={() => inputRef.current?.focus()}>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
        <div style={{ color: COLORS.textDim, marginBottom: 4 }}>
          namespace: <span style={{ color: ns.color }}>{ns.name}</span> — コマンドは <span style={{ color: COLORS.cyan }}>ip netns exec {ns.name}</span> で実行
        </div>
        <div style={{ color: COLORS.textDim, marginBottom: 8, fontSize: 10 }}>↑↓: 履歴 · Ctrl+C: 中断 · Ctrl+L: クリア</div>
        {history.map((entry, i) => (
          <div key={i}>
            {(entry.type === "cmd" || entry.type === "stdin")
              ? <div><span style={{ color: entry.type === "stdin" ? COLORS.cyan : ns.color }}>{entry.type === "stdin" ? ">" : "$"}</span> <span style={{ color: COLORS.text }}>{entry.text}</span></div>
              : <pre style={{ color: entry.type === "err" ? COLORS.red : COLORS.green, margin: "2px 0 6px 0", padding: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 10, lineHeight: 1.5 }}>{entry.text}</pre>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
        <span style={{ color: ns.color, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>$</span>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
          placeholder={!shellReady ? "シェル未接続..." : running ? "実行中... (Ctrl+C で中断)" : "コマンドを入力..."} disabled={!dockerReady || !shellReady}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: COLORS.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", padding: "4px 0" }} />
        {running && (
          <button onClick={killCmd} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>Stop</button>
        )}
      </div>
    </div>
  );
};

const HostTerminal = ({ tabId, dockerReady }) => {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const sessionIdRef = useRef(`${tabId}-shell`);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  // 永続シェルを開く
  useEffect(() => {
    if (!isElectron() || !window.electronAPI.docker.openShell || !dockerReady) return;
    const sid = sessionIdRef.current;
    openShell(sid, 'bash');
    setShellReady(true);
    return () => { closeShell(sid); };
  }, [dockerReady]);

  // ストリームデータ受信
  useEffect(() => {
    if (!isElectron() || !window.electronAPI.stream) return;
    const cleanup = onShellData((sid, data) => {
      if (sid !== sessionIdRef.current) return;

      if (data.includes('__SHELL_EXIT__')) {
        setRunning(false);
        setShellReady(false);
        const clean = data.replace('__SHELL_EXIT__', '').trim();
        if (clean) setHistory(prev => [...prev, { type: "ok", text: clean }]);
        setHistory(prev => [...prev, { type: "err", text: "[shell exited]" }]);
      } else if (data.includes('__CMD_DONE__')) {
        setRunning(false);
        const clean = data.replace('\n__CMD_DONE__', '').replace('__CMD_DONE__', '').trim();
        if (clean) setHistory(prev => [...prev, { type: "ok", text: clean }]);
      } else {
        setHistory(prev => {
          const last = prev[prev.length - 1];
          if (last && last.type === "stream") {
            const updated = [...prev];
            updated[updated.length - 1] = { type: "stream", text: last.text + data };
            return updated;
          }
          return [...prev, { type: "stream", text: data }];
        });
      }
    });
    return cleanup;
  }, []);

  const runCmd = async () => {
    const cmd = input.trim();
    if (!cmd || !dockerReady || !shellReady || running) return;
    setInput(""); setCmdHistory(prev => [...prev, cmd]); setHistoryIdx(-1);
    setHistory(prev => [...prev, { type: "cmd", text: cmd }]);
    setRunning(true);

    try {
      await sendCommand(sessionIdRef.current, cmd);
    } catch (e) {
      setHistory(prev => [...prev, { type: "err", text: e.message }]);
      setRunning(false);
    }
    inputRef.current?.focus();
  };

  const killCmd = async () => {
    await killSession(sessionIdRef.current);
    setHistory(prev => [...prev, { type: "err", text: "^C" }]);
    setRunning(false);
  };

  const sendStdin = async () => {
    if (!shellReady) return;
    const text = input;
    setInput("");
    if (text) {
      setCmdHistory(prev => [...prev, text]);
      setHistory(prev => [...prev, { type: "stdin", text }]);
    }
    await writeSession(sessionIdRef.current, `${text}\n`);
  };

  const onKeyDown = (e) => {
    if (e.key === "c" && e.ctrlKey && running) { e.preventDefault(); killCmd(); return; }
    if (e.key === "Enter") { e.preventDefault(); if (running) sendStdin(); else runCmd(); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!cmdHistory.length) return;
      const i = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(i); setInput(cmdHistory[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      const i = historyIdx + 1;
      if (i >= cmdHistory.length) { setHistoryIdx(-1); setInput(""); }
      else { setHistoryIdx(i); setInput(cmdHistory[i]); }
    } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setHistory([]); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }} onClick={() => inputRef.current?.focus()}>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
        <div style={{ color: COLORS.textDim, marginBottom: 4 }}>
          host terminal: <span style={{ color: COLORS.cyan }}>container Linux host (root namespace)</span> 
        </div>
        <div style={{ color: COLORS.textDim, marginBottom: 8, fontSize: 10 }}>↑↓: 履歴 · Ctrl+C: 中断 · Ctrl+L: クリア</div>
        {history.map((entry, i) => (
          <div key={i}>
            {(entry.type === "cmd" || entry.type === "stdin")
              ? <div><span style={{ color: COLORS.cyan }}>{entry.type === "stdin" ? ">" : "$"}</span> <span style={{ color: COLORS.text }}>{entry.text}</span></div>
              : <pre style={{ color: entry.type === "err" ? COLORS.red : COLORS.green, margin: "2px 0 6px 0", padding: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 10, lineHeight: 1.5 }}>{entry.text}</pre>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
        <span style={{ color: COLORS.cyan, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>$</span>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
          placeholder={!shellReady ? "シェル未接続..." : running ? "実行中... (Ctrl+C で中断)" : "コンテナホストコマンドを入力..."} disabled={!dockerReady || !shellReady}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: COLORS.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", padding: "4px 0" }} />
        {running && (
          <button onClick={killCmd} style={{ background: COLORS.red, color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer" }}>Stop</button>
        )}
      </div>
    </div>
  );
};


const isElectron = () => Boolean(window.electronAPI);

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
  const [execLog, setExecLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
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
  const update = useCallback((fn) => setState(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; }), []);
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
  }, [dockerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Terminal tabs ── */
  const openTerminal = useCallback((ns) => {
    setShowTerminal(true);
    const count = terminalTabs.filter(t => t.nsId === ns.id).length;
    const tabId = `${ns.id}_${Date.now()}`;
    setTerminalTabs(prev => [...prev, {
      tabId,
      kind: 'ns',
      nsId: ns.id,
      nsName: ns.name,
      color: ns.color,
      label: count === 0 ? ns.name : `${ns.name} (${count + 1})`,
    }]);
    setActiveTermTab(tabId);
  }, [terminalTabs]);

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
      if (activeTermTab === tabId) setActiveTermTab(next.length ? next[next.length - 1].tabId : null);
      if (!next.length) setShowTerminal(false);
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

  const openVlanModal = useCallback((vethId, end, ifaceName, nsId) => {
    setVlanModal({ vethId, end, ifaceName, nsId, vlanId: '', ip: '', removeParentIp: false });
  }, []);

  const confirmVlan = useCallback(async () => {
    if (!vlanModal) return;
    const { vethId, end, ifaceName, nsId, vlanId: vidStr, ip, removeParentIp } = vlanModal;
    if (!validateCidr(ip)) { alert(CIDR_ERROR_MSG); return; }
    const vid = parseInt(vidStr, 10);
    if (!vid || vid < 1 || vid > 4094) return;
    const ns = namespaces.find(n => n.id === nsId);
    if (!ns) return;
    const prefix = `ip netns exec ${ns.name}`;
    const subName = `${ifaceName}.${vid}`;

    if (dockerReady) {
      if (removeParentIp) {
        const v = veths.find(vv => vv.id === vethId);
        const parentIp = v ? v[end].ip : null;
        if (parentIp) await execAndLog(`${prefix} ip addr del ${parentIp} dev ${ifaceName}`);
      }
      await execAndLog(`${prefix} ip link add link ${ifaceName} name ${subName} type vlan id ${vid}`);
      await execAndLog(`${prefix} ip link set ${subName} up`);
      if (ip) await execAndLog(`${prefix} ip addr add ${ip} dev ${subName}`);
    }
    update(s => {
      s.vlans.push({ id: uid(), parentType: 'veth', parentId: vethId, parentEnd: end, vlanId: vid, name: subName, ip: ip || null, nsId });
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
    if (r.success) addExecLog('save', `Saved to ${r.filePath}`);
  }, [state, ipForwardMap, iptablesMap, addExecLog]);

  const loadTopology = useCallback(async () => {
    if (!isElectron()) return;
    const r = await loadFile();
    if (!r.success) return;
    await applyTopologyData(r.data);
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
  const addNs = () => { const i = namespaces.length; setModal({ type: "addNs", data: { name: `ns${i+1}`, color: NS_COLORS[i%NS_COLORS.length] } }); };
  const addBridge = () => setModal({ type: "addBridge", data: { name: `br${bridges.length}`, nsId: namespaces[0]?.id||"", ip: "" } });
  const addVeth = () => { const i = veths.length+1; setModal({ type: "addVeth", data: { name: `veth-pair-${i}`, endAName: `veth${i}a`, endANs: namespaces[0]?.id||"", endAIp: "", endAMac: "", endABridge: "", endBName: `veth${i}b`, endBNs: namespaces[1]?.id||namespaces[0]?.id||"", endBIp: "", endBMac: "", endBBridge: "" } }); };
  const addRoute = () => setModal({ type: "addRoute", data: { nsId: namespaces[0]?.id||"", dest: "", gateway: "", iface: "" } });
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
      update(s => { const mx = s.namespaces.reduce((m,n) => Math.max(m,n.x), 0); s.namespaces.push({ id: nsId, name: data.name, x: s.namespaces.length === 0 ? 150 : mx + NS_W + 60, y: 200, color: data.color, isDefault: false }); });
    } else if (type === "addBridge") {
      if (!validateCidr(data.ip)) { alert(CIDR_ERROR_MSG); return; }
      const ns = namespaces.find(n => n.id === data.nsId);
      if (dockerReady && ns) {
        const p = `ip netns exec ${ns.name}`;
        let r = await execAndLog(`${p} ip link add ${data.name} type bridge`); if (!r.success) { alert(`Failed: ${r.output}`); return; }
        await execAndLog(`${p} ip link set ${data.name} up`);
        if (data.ip) await execAndLog(`${p} ip addr add ${data.ip} dev ${data.name}`);
      }
      update(s => s.bridges.push({ id: uid(), name: data.name, nsId: data.nsId, ip: data.ip, vlanFiltering: false }));
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
      if (!data.gateway && !data.iface) {
        alert("GATEWAYまたはINTERFACEのいずれかを入力してください");
        return;
      }
      const ns = namespaces.find(n => n.id === data.nsId);
      if (dockerReady && ns) {
        const dev = data.iface ? ` dev ${data.iface}` : "";
        const via = data.gateway ? ` via ${data.gateway}` : "";
        await execAndLog(`ip netns exec ${ns.name} ip route add ${data.dest}${via}${dev}`);
      }
      update(s => s.routes.push({ id: uid(), nsId: data.nsId, dest: data.dest, gateway: data.gateway, iface: data.iface }));
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
      if (!next.length) setShowTerminal(false);
      else if (!next.find(t => t.tabId === activeTermTab)) setActiveTermTab(next[next.length - 1].tabId);
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

  const deleteRoute = (id) => update(s => { s.routes = s.routes.filter(r => r.id !== id); });

  const deleteCommand = (id) => update(s => { s.commands = s.commands.filter(c => c.id !== id); });


  const resetAll = async () => {
    if (dockerReady) for (const ns of namespaces) await execAndLog(`ip netns del ${ns.name}`);
    setState(defaultState()); setSelected(null); setTerminalTabs([]); setActiveTermTab(null); setShowTerminal(false); setExecLog([]);
  };

  const ifacePos = getInterfacePositions(namespaces, bridges, veths, vlans);
  const nsOptions = namespaces.map(n => ({ value: n.id, label: n.name }));
  const bridgeOptions = nsId => [{ value: "", label: "(none)" }, ...bridges.filter(b => b.nsId === nsId).map(b => ({ value: b.id, label: b.name }))];

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div style={{ width: "100vw", height: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', system-ui, sans-serif", color: COLORS.text, overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${COLORS.bg}}::-webkit-scrollbar-thumb{background:${COLORS.border};border-radius:3px}`}</style>

      {/* ── Top Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.network} size={15} color="#fff" />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>netns<span style={{ color: COLORS.accent }}>viz</span></span>
        </div>
        <div style={{ width: 1, height: 20, background: COLORS.border }} />

        {isElectron() && (<>
          {!dockerReady
            ? <Btn small onClick={startDocker} disabled={dockerLoading} color={dockerLoading ? COLORS.textDim : COLORS.green}>{dockerLoading ? "⏳ 起動中..." : "🐳 Docker起動"}</Btn>
            : <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.green, fontFamily: "'JetBrains Mono', monospace" }}><span style={{ width: 6, height: 6, borderRadius: 3, background: COLORS.green, display: "inline-block" }} />Docker Ready</div>}
          <div style={{ width: 1, height: 20, background: COLORS.border }} />
        </>)}

        <Btn small onClick={addNs} disabled={isElectron() && !dockerReady}><Icon d={Icons.plus} size={12} color="#fff" /> Namespace</Btn>
        <Btn small onClick={addBridge} color={COLORS.green} disabled={!namespaces.length}><Icon d={Icons.plus} size={12} color="#fff" /> Bridge(L2SW)</Btn>
        <Btn small onClick={addVeth} color={COLORS.orange} disabled={!namespaces.length}><Icon d={Icons.plus} size={12} color="#fff" /> Veth Pair</Btn>
        <Btn small onClick={addRoute} color={COLORS.purple} disabled={!namespaces.length}><Icon d={Icons.plus} size={12} color="#fff" /> Route</Btn>
        <Btn small onClick={addCommand} color={COLORS.cyan} disabled={!namespaces.length}><Icon d={Icons.plus} size={12} color="#fff" /> Command</Btn>

        <div style={{ flex: 1 }} />

        {isElectron() && (<>
          <Btn small ghost onClick={saveTopology} disabled={!namespaces.length}><Icon d={Icons.save} size={12} color={COLORS.textMuted} /> 保存</Btn>
          <Btn small ghost onClick={loadTopology}><Icon d={Icons.folder} size={12} color={COLORS.textMuted} /> 読込</Btn>
        </>)}
        <Btn small ghost onClick={() => setShowLog(!showLog)}><Icon d={Icons.code} size={12} color={COLORS.textMuted} /> ログ</Btn>
<Btn small ghost onClick={generateCommands} disabled={!namespaces.length}><Icon d={Icons.terminal} size={12} color={COLORS.textMuted} /> コマンド生成</Btn>
        {isElectron() && <Btn small ghost onClick={openHostTerminal} disabled={!dockerReady}><Icon d={Icons.terminal} size={12} color={COLORS.textMuted} /> ターミナル(host)</Btn>}
        <Btn small ghost onClick={resetAll}><Icon d={Icons.x} size={12} color={COLORS.textMuted} /> リセット</Btn>
        <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(zoom * 100)}%</div>
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Canvas ── */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <svg ref={svgRef} width="100%" height="100%" style={{ cursor: panning ? "grabbing" : "grab" }} onMouseDown={e => { setVethCtxMenu(null); onBgMouseDown(e); }} onWheel={onWheel}>
              <rect width="100%" height="100%" fill={COLORS.bg} />
              <defs><pattern id="grid" width={40*zoom} height={40*zoom} patternUnits="userSpaceOnUse" x={pan.x%(40*zoom)} y={pan.y%(40*zoom)}><circle cx={1} cy={1} r={0.5} fill="#1e293b" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {/* Veth lines */}
                {veths.map(v => {
                  const pA = ifacePos[v.endA.id], pB = ifacePos[v.endB.id];
                  if (!pA || !pB) return null;
                  const cp1x = pA.side === "right" ? pA.x+80 : pA.x-80;
                  const cp2x = pB.side === "left" ? pB.x-80 : pB.x+80;
                  return (
                    <g key={v.id} onContextMenu={e => { e.preventDefault(); setVethCtxMenu({ vethId: v.id, x: e.clientX, y: e.clientY }); }}>
                      <path d={`M${pA.x},${pA.y} C${cp1x},${pA.y} ${cp2x},${pB.y} ${pB.x},${pB.y}`} stroke={COLORS.orange} strokeWidth={2} fill="none" strokeDasharray="6 4" opacity={0.6} />
                      <path d={`M${pA.x},${pA.y} C${cp1x},${pA.y} ${cp2x},${pB.y} ${pB.x},${pB.y}`} stroke="transparent" strokeWidth={12} fill="none" />
                      <circle cx={pA.x} cy={pA.y} r={4} fill={COLORS.orange} /><circle cx={pB.x} cy={pB.y} r={4} fill={COLORS.orange} />
                      <text x={(pA.x+pB.x)/2} y={Math.min(pA.y,pB.y)-10} textAnchor="middle" fontSize={9} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">{v.name}</text>
                    </g>);
                })}

                {/* Namespace boxes */}
                {namespaces.map(ns => {
                  const h = getNsHeight(ns, bridges, veths, vlans);
                  const isSel = selected === ns.id;
                  return (
                    <g key={ns.id} onMouseDown={e => onMouseDown(e, ns.id)} style={{ cursor: "move" }}>
                      <rect x={ns.x+3} y={ns.y+3} width={NS_W} height={h} rx={10} fill="rgba(0,0,0,0.3)" />
                      <rect x={ns.x} y={ns.y} width={NS_W} height={h} rx={10} fill={COLORS.surface} stroke={isSel ? ns.color : COLORS.border} strokeWidth={isSel ? 2 : 1} onClick={e => { e.stopPropagation(); setSelected(ns.id); }} />
                      <rect x={ns.x} y={ns.y} width={NS_W} height={NS_HEADER} rx={10} fill={ns.color+"18"} />
                      <rect x={ns.x} y={ns.y+NS_HEADER-1} width={NS_W} height={2} fill={ns.color+"30"} />
                      <circle cx={ns.x+18} cy={ns.y+NS_HEADER/2} r={5} fill={ns.color} />
                      <text x={ns.x+32} y={ns.y+NS_HEADER/2+1} dominantBaseline="middle" fontSize={13} fontWeight="700" fill={COLORS.text} fontFamily="'JetBrains Mono', monospace">{ns.name}</text>
                      
                      {/* MT (MAC Table) button (bridge namespaces only) */}
                      {dockerReady && bridges.some(b => b.nsId === ns.id) && (
                        <g onClick={e => { e.stopPropagation(); showMacTable(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-244} y={ns.y+10} width={28} height={22} rx={4} fill={ns.color+"20"} />
                          <text x={ns.x+NS_W-230} y={ns.y+23} fontSize={9} fill={ns.color} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">MT</text>
                        </g>
                      )}

                      {/* AT (ARP Table) button */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); showArpTable(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-212} y={ns.y+10} width={28} height={22} rx={4} fill={ns.color+"20"} />
                          <text x={ns.x+NS_W-198} y={ns.y+23} fontSize={9} fill={ns.color} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">AT</text>
                        </g>
                      )}

                      {/* RT (Route Table) button */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); showRouteTable(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-180} y={ns.y+10} width={28} height={22} rx={4} fill={ns.color+"20"} />
                          <text x={ns.x+NS_W-166} y={ns.y+23} fontSize={10} fill={ns.color} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">RT</text>
                        </g>
                      )}

                      {/* ip_forward toggle (FWD) */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); toggleIpForward(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-148} y={ns.y+10} width={28} height={22} rx={4} fill={ipForwardMap[ns.id] ? (ns.color || COLORS.green)+"20" : COLORS.border} />
                          <text x={ns.x+NS_W-134} y={ns.y+23} fontSize={10} fill={ipForwardMap[ns.id] ? (ns.color || COLORS.green) : COLORS.textDim} fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">FWD</text>
                        </g>
                      )}

                      {/* iptables button (IPT) */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); showIptables(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-116} y={ns.y+10} width={28} height={22} rx={4}
                            fill={(iptablesMap[ns.id]?.length) ? ns.color+"20" : COLORS.border} />
                          <text x={ns.x+NS_W-102} y={ns.y+23} fontSize={9} fill={(iptablesMap[ns.id]?.length) ? ns.color : COLORS.textDim}
                            fontFamily="'JetBrains Mono', monospace" textAnchor="middle" fontWeight="700">IPT</text>
                        </g>
                      )}

                      {/* Terminal button */}
                      {dockerReady && (
                        <g onClick={e => { e.stopPropagation(); openTerminal(ns); }} style={{ cursor: "pointer" }}>
                          <rect x={ns.x+NS_W-84} y={ns.y+10} width={22} height={22} rx={4} fill={ns.color+"20"} />
                          <text x={ns.x+NS_W-73} y={ns.y+23} fontSize={11} fill={ns.color} fontFamily="'JetBrains Mono', monospace" textAnchor="middle">{">_"}</text>
                        </g>
                      )}

                      {/* Delete */}
                      <g onClick={e => { e.stopPropagation(); deleteNs(ns.id); }} style={{ cursor: "pointer" }}>
                        <rect x={ns.x+NS_W-32} y={ns.y+10} width={22} height={22} rx={4} fill="transparent" />
                        <line x1={ns.x+NS_W-25} y1={ns.y+17} x2={ns.x+NS_W-17} y2={ns.y+25} stroke={COLORS.textDim} strokeWidth={1.5} />
                        <line x1={ns.x+NS_W-17} y1={ns.y+17} x2={ns.x+NS_W-25} y2={ns.y+25} stroke={COLORS.textDim} strokeWidth={1.5} />
                      </g>

                      {/* Interfaces */}
                      {(() => {
                        let idx = 0; const items = [];
                        bridges.filter(b => b.nsId === ns.id).forEach(b => {
                          const y = ns.y + NS_HEADER + idx * NS_ITEM_H;
                          items.push(<g key={b.id}>
                            <rect x={ns.x+8} y={y+4} width={NS_W-16} height={NS_ITEM_H-6} rx={4} fill={COLORS.greenGlow} />
                            <text x={ns.x+20} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={11} fill={COLORS.green} fontFamily="'JetBrains Mono', monospace" fontWeight="600">🌉 {b.name}</text>
                            {b.ip && <text x={ns.x+NS_W-100} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">{b.ip}</text>}
                            {dockerReady && (
                              <g onClick={e => { e.stopPropagation(); toggleBridgeVlanFiltering(b.id); }} style={{ cursor: "pointer" }}>
                                <rect x={ns.x+NS_W-72} y={y+8} width={36} height={18} rx={9} fill={b.vlanFiltering ? COLORS.cyan+"40" : COLORS.border} />
                                <circle cx={b.vlanFiltering ? ns.x+NS_W-45 : ns.x+NS_W-63} cy={y+17} r={6} fill={b.vlanFiltering ? COLORS.cyan : COLORS.textDim} />
                                <text x={ns.x+NS_W-54} y={y+32} textAnchor="middle" fontSize={7} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">VLAN</text>
                              </g>
                            )}
                            <g onClick={e => { e.stopPropagation(); deleteBridge(b.id); }} style={{ cursor: "pointer" }}><text x={ns.x+NS_W-24} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={10} fill={COLORS.red} style={{ opacity: 0.5 }}>✕</text></g>
                          </g>); idx++;
                        });
                        veths.forEach(v => { ["endA","endB"].forEach(end => {
                          if (v[end].nsId === ns.id) {
                            const y = ns.y + NS_HEADER + idx * NS_ITEM_H;
                            const brName = v[end].bridge ? bridges.find(b => b.id === v[end].bridge)?.name : null;
                            items.push(<g key={v[end].id}>
                              <rect x={ns.x+8} y={y+4} width={NS_W-16} height={NS_ITEM_H-6} rx={4} fill={COLORS.orangeGlow}
                                onClick={e => { e.stopPropagation(); const nsObj = namespaces.find(n => n.id === v[end].nsId); if (dockerReady && nsObj) openIfaceModal(v.id, end, v[end].name, nsObj.name, v[end].ip, v[end].mac); }}
                                style={{ cursor: dockerReady ? "pointer" : "default" }} />
                              <text x={ns.x+20} y={y+16} dominantBaseline="middle" fontSize={11} fill={COLORS.orange} fontFamily="'JetBrains Mono', monospace" fontWeight="600"
                                onClick={e => { e.stopPropagation(); const nsObj = namespaces.find(n => n.id === v[end].nsId); if (dockerReady && nsObj) openIfaceModal(v.id, end, v[end].name, nsObj.name, v[end].ip, v[end].mac); }}
                                style={{ cursor: dockerReady ? "pointer" : "default" }}>🔗 {v[end].name}</text>
                              <text x={ns.x+NS_W-50} y={y+16} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace"
                                onClick={e => { e.stopPropagation(); const nsObj = namespaces.find(n => n.id === v[end].nsId); if (dockerReady && nsObj) openIfaceModal(v.id, end, v[end].name, nsObj.name, v[end].ip, v[end].mac); }}
                                style={{ cursor: dockerReady ? "pointer" : "default" }}>
                                {v[end].ip||""}{brName ? ` → ${brName}` : ""}
                              </text>
                              {v[end].mac && (
                                <text x={ns.x+NS_W-50} y={y+30} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace"
                                  onClick={e => { e.stopPropagation(); const nsObj = namespaces.find(n => n.id === v[end].nsId); if (dockerReady && nsObj) openIfaceModal(v.id, end, v[end].name, nsObj.name, v[end].ip, v[end].mac); }}
                                  style={{ cursor: dockerReady ? "pointer" : "default" }}>
                                  {v[end].mac}
                                </text>
                              )}
                              {/* VL button - bridge VLAN config */}
                              {dockerReady && v[end].bridge && (() => {
                                const br = bridges.find(bb => bb.id === v[end].bridge);
                                if (!br || !br.vlanFiltering) return null;
                                return (
                                  <g onClick={e => { e.stopPropagation(); openBridgeVlanModal(br.id, br.name, v[end].name, 'port', v.id, end, v[end].nsId); }} style={{ cursor: "pointer" }}>
                                    <rect x={ns.x+42} y={y+24} width={20} height={14} rx={3} fill={COLORS.cyan+"30"} />
                                    <text x={ns.x+52} y={y+33} textAnchor="middle" fontSize={8} fill={COLORS.cyan} fontFamily="'JetBrains Mono', monospace" fontWeight="700">VL</text>
                                  </g>
                                );
                              })()}
                              {/* Port mode display A:/T: */}
                              {v[end].bridge && (() => {
                                const bvs = bridgeVlans.filter(bv => bv.vethId === v.id && bv.vethEnd === end);
                                if (!bvs.length) return null;
                                const isAccess = bvs.length === 1 && bvs[0].pvid && bvs[0].untagged;
                                return (
                                  <text x={ns.x+68} y={y+33} fontSize={8} fill={COLORS.cyan} fontFamily="'JetBrains Mono', monospace">
                                    {isAccess ? `A:${bvs[0].vid}` : `T:${bvs.map(b=>b.vid).join(',')}`}
                                  </text>
                                );
                              })()}
                              {/* V button - endpoint VLAN sub-interface */}
                              {dockerReady && !v[end].bridge && showVlanSubIface && (
                                <g onClick={e => { e.stopPropagation(); openVlanModal(v.id, end, v[end].name, v[end].nsId); }} style={{ cursor: "pointer" }}>
                                  <rect x={ns.x+42} y={y+24} width={14} height={14} rx={3} fill={COLORS.orange+"30"} />
                                  <text x={ns.x+49} y={y+33} textAnchor="middle" fontSize={8} fill={COLORS.orange} fontFamily="'JetBrains Mono', monospace" fontWeight="700">V</text>
                                </g>
                              )}
                              <g onClick={e => { e.stopPropagation(); deleteVeth(v.id); }} style={{ cursor: "pointer" }}><text x={ns.x+NS_W-24} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={10} fill={COLORS.red} style={{ opacity: 0.5 }}>✕</text></g>
                            </g>); idx++;
                          }
                        }); });
                        vlans.filter(vl => vl.nsId === ns.id).forEach(vl => {
                          const y = ns.y + NS_HEADER + idx * NS_ITEM_H;
                          items.push(<g key={vl.id}>
                            <rect x={ns.x+8} y={y+4} width={NS_W-16} height={NS_ITEM_H-6} rx={4} fill={COLORS.cyanGlow} />
                            <text x={ns.x+20} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={11} fill={COLORS.cyan} fontFamily="'JetBrains Mono', monospace" fontWeight="600">🏷 {vl.name}</text>
                            {vl.ip && <text x={ns.x+NS_W-50} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">{vl.ip}</text>}
                            <g onClick={e => { e.stopPropagation(); deleteVlan(vl.id); }} style={{ cursor: "pointer" }}><text x={ns.x+NS_W-24} y={y+NS_ITEM_H/2+2} dominantBaseline="middle" fontSize={10} fill={COLORS.red} style={{ opacity: 0.5 }}>✕</text></g>
                          </g>); idx++;
                        });
                        return items;
                      })()}
                    </g>);
                })}

                {!namespaces.length && (
                  <text x={300} y={200} textAnchor="middle" fontSize={14} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">
                    {dockerReady ? "「+ Namespace」で始めましょう" : isElectron() ? "まず「🐳 Docker起動」をクリック" : "Electronで起動するとDockerと連携できます"}
                  </text>
                )}
              </g>
            </svg>

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

          {/* ── Exec Log Panel ── */}
          {showLog && (
            <div style={{ width: 360, borderLeft: `1px solid ${COLORS.border}`, background: COLORS.bg, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.cyan, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>実行ログ</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn small ghost onClick={() => setExecLog([])}>Clear</Btn>
                  <Btn small ghost onClick={() => setShowLog(false)}><Icon d={Icons.x} size={10} color={COLORS.textMuted} /></Btn>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
                {!execLog.length && <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", padding: 8 }}>GUIの操作ログがここに表示されます</div>}
                {execLog.map((e, i) => (
                  <div key={i} style={{ marginBottom: 10, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                    <div style={{ color: COLORS.textDim, fontSize: 9 }}>{e.time}</div>
                    <div style={{ color: COLORS.cyan }}>$ {e.cmd}</div>
                    {e.output && <pre style={{ color: e.success ? COLORS.green : COLORS.red, margin: "2px 0 0 0", padding: 0, fontSize: 10, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.4 }}>{e.output}</pre>}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* ── Terminal Panel (bottom) ── */}
        {showTerminal && terminalTabs.length > 0 && (
          <div style={{ height: 260, borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface, flexShrink: 0, overflow: "auto" }}>
              {terminalTabs.map(tab => (
                <div key={tab.tabId} onClick={() => setActiveTermTab(tab.tabId)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                    cursor: "pointer", fontWeight: 600, color: activeTermTab === tab.tabId ? tab.color : COLORS.textDim,
                    background: activeTermTab === tab.tabId ? COLORS.bg : "transparent",
                    borderBottom: activeTermTab === tab.tabId ? `2px solid ${tab.color}` : "2px solid transparent",
                    whiteSpace: "nowrap", flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: tab.color, display: "inline-block" }} />
                  {tab.label}
                  <span onClick={e => { e.stopPropagation(); closeTermTab(tab.tabId); }} style={{ color: COLORS.textDim, fontSize: 10, marginLeft: 4, cursor: "pointer" }}>✕</span>
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <Btn small ghost onClick={() => setShowTerminal(false)} style={{ marginRight: 8 }}><Icon d={Icons.x} size={10} color={COLORS.textMuted} /></Btn>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              {terminalTabs.map(tab => (
                <div key={tab.tabId} style={{ display: activeTermTab === tab.tabId ? "flex" : "none", height: "100%", flexDirection: "column" }}>
                  {tab.kind === 'host'
                    ? <HostTerminal tabId={tab.tabId} dockerReady={dockerReady} />
                    : <NsTerminal tabId={tab.tabId} ns={{ id: tab.nsId, name: tab.nsName, color: tab.color }} dockerReady={dockerReady} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === "addNs" && (
        <Modal title="Add Namespace" onClose={() => setModal(null)}>
          <Input label="Name" value={modal.data.name} onChange={v => setModal({...modal, data:{...modal.data, name:v}})} mono placeholder="ns-name" />
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {NS_COLORS.map(c => <div key={c} onClick={() => setModal({...modal, data:{...modal.data, color:c}})}
              style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: modal.data.color === c ? "2px solid #fff" : "2px solid transparent" }} />)}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn ghost small onClick={() => setModal(null)}>キャンセル</Btn>
            <Btn small onClick={confirmModal}>追加</Btn>
          </div>
        </Modal>
      )}

      {modal?.type === "addBridge" && (
        <Modal title="Add Bridge" onClose={() => setModal(null)}>
          <Input label="Name" value={modal.data.name} onChange={v => setModal({...modal, data:{...modal.data, name:v}})} mono />
          <Select label="Namespace" value={modal.data.nsId} onChange={v => setModal({...modal, data:{...modal.data, nsId:v}})} options={nsOptions} />
          <Input label="IP Address" value={modal.data.ip} onChange={v => setModal({...modal, data:{...modal.data, ip:v}})} mono placeholder="10.0.0.1/24" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn ghost small onClick={() => setModal(null)}>キャンセル</Btn>
            <Btn small color={COLORS.green} onClick={confirmModal}>追加</Btn>
          </div>
        </Modal>
      )}

      {modal?.type === "addVeth" && (
        <Modal title="Add Veth Pair" onClose={() => setModal(null)} width={500}>
          <Input label="Pair Name" value={modal.data.name} onChange={v => setModal({...modal, data:{...modal.data, name:v}})} mono />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: COLORS.orange, fontWeight: 700, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>END A</div>
              <Input label="Interface Name" value={modal.data.endAName} onChange={v => setModal({...modal, data:{...modal.data, endAName:v}})} mono />
              <Select label="Namespace" value={modal.data.endANs} onChange={v => setModal({...modal, data:{...modal.data, endANs:v}})} options={nsOptions} />
              <Input label="IP Address" value={modal.data.endAIp} onChange={v => setModal({...modal, data:{...modal.data, endAIp:v}})} mono placeholder="10.0.0.2/24" />
              <Input label="MAC Address (任意)" value={modal.data.endAMac} onChange={v => setModal({...modal, data:{...modal.data, endAMac:v}})} mono placeholder="aa:bb:cc:dd:ee:f1" />
              <Select label="Bridge" value={modal.data.endABridge} onChange={v => setModal({...modal, data:{...modal.data, endABridge:v}})} options={bridgeOptions(modal.data.endANs)} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: COLORS.orange, fontWeight: 700, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>END B</div>
              <Input label="Interface Name" value={modal.data.endBName} onChange={v => setModal({...modal, data:{...modal.data, endBName:v}})} mono />
              <Select label="Namespace" value={modal.data.endBNs} onChange={v => setModal({...modal, data:{...modal.data, endBNs:v}})} options={nsOptions} />
              <Input label="IP Address" value={modal.data.endBIp} onChange={v => setModal({...modal, data:{...modal.data, endBIp:v}})} mono placeholder="10.0.0.3/24" />
              <Input label="MAC Address (任意)" value={modal.data.endBMac} onChange={v => setModal({...modal, data:{...modal.data, endBMac:v}})} mono placeholder="aa:bb:cc:dd:ee:f2" />
              <Select label="Bridge" value={modal.data.endBBridge} onChange={v => setModal({...modal, data:{...modal.data, endBBridge:v}})} options={bridgeOptions(modal.data.endBNs)} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Btn ghost small onClick={() => setModal(null)}>キャンセル</Btn>
            <Btn small color={COLORS.orange} onClick={confirmModal}>追加</Btn>
          </div>
        </Modal>
      )}

      {modal?.type === "addRoute" && (
        <Modal title="Add Route" onClose={() => setModal(null)}>
          <Select label="Namespace" value={modal.data.nsId} onChange={v => setModal({...modal, data:{...modal.data, nsId:v}})} options={nsOptions} />
          <Input label="Destination" value={modal.data.dest} onChange={v => setModal({...modal, data:{...modal.data, dest:v}})} mono placeholder="default or 192.168.1.0/24" />
          <Input label="Gateway" value={modal.data.gateway} onChange={v => setModal({...modal, data:{...modal.data, gateway:v}})} mono placeholder="10.0.0.1（省略可）" />
          <Input label="Interface (optional)" value={modal.data.iface} onChange={v => setModal({...modal, data:{...modal.data, iface:v}})} mono placeholder="veth0（省略可）" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn ghost small onClick={() => setModal(null)}>キャンセル</Btn>
            <Btn small color={COLORS.purple} onClick={confirmModal}>追加</Btn>
          </div>
        </Modal>
      )}

      {modal?.type === "addCommand" && (
        <Modal title="Add Commands" onClose={() => setModal(null)}>
          <Select label="Namespace" value={modal.data.nsId} onChange={v => setModal({...modal, data:{...modal.data, nsId:v}})} options={nsOptions} />
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 4 }}>Commands (1行1コマンド)</label>
            <textarea value={modal.data.cmds} onChange={e => setModal({...modal, data:{...modal.data, cmds: e.target.value}})}
              placeholder={"iptables -A FORWARD -j ACCEPT\ntcpdump -i veth1a -w /tmp/cap.pcap"} rows={6}
              style={{ width: "100%", boxSizing: "border-box", background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 8, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", resize: "vertical" }} />
          </div>
          <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 12 }}>※ 各コマンドは ip netns exec NS_NAME を付けて実行されます</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn ghost small onClick={() => setModal(null)}>キャンセル</Btn>
            <Btn small color={COLORS.cyan} onClick={confirmModal} disabled={!modal.data.cmds.trim()}>追加</Btn>
          </div>
        </Modal>
      )}

      {routeModal && (
        <RouteModal routeModal={routeModal} setRouteModal={setRouteModal} showRouteTable={showRouteTable} />
      )}

      {macTableModal && (() => {
        const rawEntries = macTableModal.entries || '';
        const filteredEntries = rawEntries ? rawEntries.split('\n').filter(line => {
          const trimmed = line.trim();
          if (!trimmed) return false;
          return trimmed.includes('master') && !trimmed.includes('permanent') && !trimmed.includes('self');
        }).join('\n') : '';
        const displayEntries = macTableShowAll ? rawEntries : filteredEntries;
        const showEmptyMessage = !macTableShowAll && !filteredEntries;
        return (
        <Modal title={`MAC Table: ${macTableModal.nsName}`} onClose={() => { setMacTableModal(null); setMacTableShowAll(false); }} width={500}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Btn small ghost={macTableShowAll} onClick={() => setMacTableShowAll(false)}
              style={!macTableShowAll ? { background: COLORS.accent, color: '#fff' } : {}}>学習済みのみ</Btn>
            <Btn small ghost={!macTableShowAll} onClick={() => setMacTableShowAll(true)}
              style={macTableShowAll ? { background: COLORS.accent, color: '#fff' } : {}}>すべて表示</Btn>
          </div>
          {showEmptyMessage ? (
            <div style={{ background: COLORS.bg, color: COLORS.textMuted, padding: 16, borderRadius: 8, fontSize: 12, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
              まだMACアドレスが学習されていません。pingを実行すると学習されます。
            </div>
          ) : (
            <pre style={{ background: COLORS.bg, color: COLORS.green, padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7, border: `1px solid ${COLORS.border}`, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>
              {displayEntries || '(empty)'}
            </pre>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Btn small ghost onClick={() => showMacTable({ id: macTableModal.nsId, name: macTableModal.nsName, color: macTableModal.nsColor })}>🔄 更新</Btn>
            <Btn small ghost onClick={() => { setMacTableModal(null); setMacTableShowAll(false); }}>閉じる</Btn>
          </div>
        </Modal>
        );
      })()}

      {arpTableModal && (
        <Modal title={`ARP Table: ${arpTableModal.nsName}`} onClose={() => setArpTableModal(null)} width={500}>
          <pre style={{ background: COLORS.bg, color: COLORS.green, padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7, border: `1px solid ${COLORS.border}`, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto" }}>
            {arpTableModal.entries || '(empty)'}
          </pre>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Btn small ghost onClick={() => showArpTable({ id: arpTableModal.nsId, name: arpTableModal.nsName })}>🔄 更新</Btn>
            <Btn small ghost onClick={() => setArpTableModal(null)}>閉じる</Btn>
          </div>
        </Modal>
      )}

      {iptablesModal && (
        <Modal title={`iptables: ${iptablesModal.nsName}`} onClose={() => setIptablesModal(null)} width={600}>
          {/* ルール一覧 */}
          <div style={{ maxHeight: 250, overflow: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: COLORS.textMuted }}>Table</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: COLORS.textMuted }}>Chain</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: COLORS.textMuted }}>Target</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: COLORS.textMuted }}>Extra</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {(iptablesMap[iptablesModal.nsId] || []).map(rule => (
                  <tr key={rule.id} style={{ borderBottom: `1px solid ${COLORS.border}22` }}>
                    <td style={{ padding: '6px 8px', color: COLORS.text }}>{rule.table}</td>
                    <td style={{ padding: '6px 8px', color: COLORS.text }}>{rule.chain}</td>
                    <td style={{ padding: '6px 8px', color: iptablesModal.nsColor }}>{rule.target}</td>
                    <td style={{ padding: '6px 8px', color: COLORS.textDim, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule.extra || '-'}</td>
                    <td>
                      <Btn small color={COLORS.red} onClick={() => deleteIptablesRule(iptablesModal.nsId, iptablesModal.nsName, rule.id, rule)}
                        style={{ padding: '2px 6px', fontSize: 10 }}>✕</Btn>
                    </td>
                  </tr>
                ))}
                {!(iptablesMap[iptablesModal.nsId] || []).length && (
                  <tr><td colSpan={5} style={{ padding: '12px 8px', color: COLORS.textDim, textAlign: 'center' }}>ルールなし</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ルール追加フォーム */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', padding: '12px 0', borderTop: `1px solid ${COLORS.border}` }}>
            <div>
              <label style={{ fontSize: 10, color: COLORS.textMuted, display: 'block', marginBottom: 2 }}>Table</label>
              <select value={iptablesModal.newRule.table} onChange={e => {
                const t = e.target.value;
                setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, table: t, chain: CHAIN_OPTIONS[t][0] } }));
              }} style={{ background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>
                {['filter', 'nat', 'mangle', 'raw'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: COLORS.textMuted, display: 'block', marginBottom: 2 }}>Chain</label>
              <select value={iptablesModal.newRule.chain} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, chain: e.target.value } }))}
                style={{ background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>
                {(CHAIN_OPTIONS[iptablesModal.newRule.table] || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: COLORS.textMuted, display: 'block', marginBottom: 2 }}>Target</label>
              <select value={iptablesModal.newRule.target} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, target: e.target.value } }))}
                style={{ background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12 }}>
                {['ACCEPT', 'DROP', 'REJECT', 'MASQUERADE', 'SNAT', 'DNAT', 'LOG'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted, display: 'block', marginBottom: 2 }}>Extra (match条件)</label>
              <input value={iptablesModal.newRule.extra} onChange={e => setIptablesModal(prev => ({ ...prev, newRule: { ...prev.newRule, extra: e.target.value } }))}
                placeholder="-s 10.0.0.0/24 -p tcp --dport 80"
                style={{ width: '100%', background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '4px 8px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
            <Btn small onClick={() => addIptablesRule(iptablesModal.nsId, iptablesModal.nsName)}>追加</Btn>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Btn small ghost onClick={() => setIptablesModal(null)}>閉じる</Btn>
          </div>
        </Modal>
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
        <Modal title="生成されたコマンド" onClose={() => setShowCmd(false)} width={600}>
          <pre style={{ background: COLORS.bg, color: COLORS.green, padding: 16, borderRadius: 8, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7, overflow: "auto", maxHeight: 400, border: `1px solid ${COLORS.border}`, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {cmdLog.join("\n")}
          </pre>
          {commands.length > 0 && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8 }}>カスタムコマンド</div>
              {commands.map(cmd => {
                const ns = namespaces.find(n => n.id === cmd.nsId);
                return (
                  <div key={cmd.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "4px 8px", background: COLORS.surface, borderRadius: 4, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ color: ns?.color, fontWeight: 700, flexShrink: 0 }}>{ns?.name || "?"}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: COLORS.textDim }}>
                      {cmd.cmds.split('\n').filter(l => l.trim()).join('; ')}
                    </span>
                    <span onClick={() => deleteCommand(cmd.id)} style={{ cursor: "pointer", color: COLORS.red, opacity: 0.5, fontSize: 10 }}>✕</span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Btn small ghost onClick={() => setShowCmd(false)}>閉じる</Btn>
            <Btn small onClick={() => navigator.clipboard?.writeText(cmdLog.join("\n"))}>📋 コピー</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
