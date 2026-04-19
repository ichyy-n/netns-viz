import { useState, useCallback, useRef, useEffect } from "react";

const COLORS = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceHover: "#1a2332",
  border: "#1e293b",
  borderActive: "#3b82f6",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#475569",
  accent: "#3b82f6",
  accentGlow: "rgba(59,130,246,0.15)",
  green: "#10b981",
  greenGlow: "rgba(16,185,129,0.15)",
  orange: "#f59e0b",
  orangeGlow: "rgba(245,158,11,0.15)",
  red: "#ef4444",
  redGlow: "rgba(239,68,68,0.15)",
  purple: "#a855f7",
  purpleGlow: "rgba(168,85,247,0.15)",
  cyan: "#06b6d4",
  cyanGlow: "rgba(6,182,212,0.15)",
};

const NS_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#ec4899", "#84cc16"];

let idCounter = 1;
const uid = () => `id_${idCounter++}`;

const defaultState = () => ({
  namespaces: [],
  bridges: [],
  veths: [],
  routes: [],
});

// --- Tiny SVG Icons ---
const Icon = ({ d, size = 16, color = COLORS.textMuted, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d={d} />
  </svg>
);

const Icons = {
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  network: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  bridge: "M4 6h16M4 6v6a2 2 0 002 2h12a2 2 0 002-2V6M8 14v4M16 14v4M4 18h16",
  route: "M13 17l5-5-5-5M6 17l5-5-5-5",
  play: "M5 3l14 9-14 9V3z",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  server: "M2 2h20v8H2zM2 14h20v8H2zM6 6h.01M6 18h.01",
  move: "M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3",
  x: "M18 6L6 18M6 6l12 12",
  terminal: "M4 17l6-5-6-5M12 19h8",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01",
};

// --- Button ---
const Btn = ({ children, onClick, color = COLORS.accent, small, danger, ghost, disabled, style, ...props }) => {
  const bg = danger ? COLORS.red : ghost ? "transparent" : color;
  const hoverBg = danger ? "#dc2626" : ghost ? "rgba(255,255,255,0.05)" : color + "dd";
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: small ? "4px 10px" : "7px 14px",
        fontSize: small ? 11 : 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
        color: ghost ? COLORS.textMuted : "#fff",
        background: hover && !disabled ? hoverBg : bg,
        border: ghost ? `1px solid ${COLORS.border}` : "none",
        borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1, transition: "all 0.15s",
        letterSpacing: "0.02em",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Modal ---
const Modal = ({ title, onClose, children, width = 420 }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, width, maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
        <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Icon d={Icons.x} color={COLORS.textMuted} />
        </button>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  </div>
);

// --- Input ---
const Input = ({ label, value, onChange, placeholder, mono }) => (
  <label style={{ display: "block", marginBottom: 12 }}>
    <span style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
    <input
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: "100%", padding: "8px 12px", fontSize: 13,
        fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
        color: COLORS.text, background: COLORS.bg, border: `1px solid ${COLORS.border}`,
        borderRadius: 6, outline: "none", boxSizing: "border-box",
      }}
    />
  </label>
);

const Select = ({ label, value, onChange, options }) => (
  <label style={{ display: "block", marginBottom: 12 }}>
    <span style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "8px 12px", fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        color: COLORS.text, background: COLORS.bg, border: `1px solid ${COLORS.border}`,
        borderRadius: 6, outline: "none", boxSizing: "border-box", appearance: "auto",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);

// --- Canvas: Namespace Box ---
const NS_W = 380;
const NS_HEADER = 44;
const NS_ITEM_H = 32;

function getNsHeight(ns, bridges, veths) {
  let items = 0;
  bridges.filter(b => b.nsId === ns.id).forEach(() => items++);
  veths.forEach(v => {
    if (v.endA.nsId === ns.id) items++;
    if (v.endB.nsId === ns.id) items++;
  });
  return NS_HEADER + Math.max(items, 1) * NS_ITEM_H + 16;
}

function getInterfacePositions(namespaces, bridges, veths) {
  const pos = {};
  namespaces.forEach(ns => {
    let idx = 0;
    bridges.filter(b => b.nsId === ns.id).forEach(b => {
      pos[b.id] = { x: ns.x + NS_W, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, nsId: ns.id, side: "right" };
      idx++;
    });
    veths.forEach(v => {
      if (v.endA.nsId === ns.id) {
        pos[v.endA.id] = { x: ns.x + NS_W, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, nsId: ns.id, side: "right" };
        idx++;
      }
      if (v.endB.nsId === ns.id) {
        pos[v.endB.id] = { x: ns.x, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, nsId: ns.id, side: "left" };
        idx++;
      }
    });
  });
  return pos;
}

// --- Helper: check if running in Electron ---
const isElectron = () => Boolean(window.electronAPI);

// --- Helper: log command result ---
const logResult = (action, result) => {
  if (result.success) {
    console.log(`✅ ${action}:`, result.output || 'OK');
  } else {
    console.error(`❌ ${action}:`, result.output || result.error);
  }
  return result;
};

// --- Main App ---
export default function NetnsVisualizer() {
  const [state, setState] = useState(defaultState);
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

  // Docker state
  const [dockerReady, setDockerReady] = useState(false);
  const [dockerLoading, setDockerLoading] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [pingModal, setPingModal] = useState(null);
  const terminalEndRef = useRef(null);

  const { namespaces, bridges, veths, routes } = state;

  const update = useCallback((fn) => setState(prev => {
    const next = JSON.parse(JSON.stringify(prev));
    fn(next);
    return next;
  }), []);

  // --- Terminal log ---
  const addTermLog = useCallback((cmd, output, success = true) => {
    setTerminalOutput(prev => [...prev, { cmd, output, success, time: new Date().toLocaleTimeString() }]);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  // --- Docker startup ---
  const startDocker = useCallback(async () => {
    if (!isElectron()) return;
    setDockerLoading(true);
    try {
      const result = await window.electronAPI.docker.start();
      logResult('Docker start', result);
      if (result.success) {
        setDockerReady(true);
        addTermLog('docker start', 'Container started successfully');
      }
    } catch (e) {
      addTermLog('docker start', `Error: ${e.message}`, false);
    }
    setDockerLoading(false);
  }, [addTermLog]);

  // --- Execute and log ---
  const execAndLog = useCallback(async (cmd) => {
    if (!isElectron() || !dockerReady) return { success: false, output: 'Docker not ready' };
    const result = await window.electronAPI.docker.exec(cmd);
    logResult(cmd, result);
    addTermLog(cmd, result.output || (result.success ? 'OK' : 'Failed'), result.success);
    return result;
  }, [dockerReady, addTermLog]);

  // --- Drag ---
  const onMouseDown = useCallback((e, nsId) => {
    e.stopPropagation();
    const ns = namespaces.find(n => n.id === nsId);
    setDragging({ nsId, offsetX: e.clientX / zoom - ns.x + pan.x / zoom, offsetY: e.clientY / zoom - ns.y + pan.y / zoom });
  }, [namespaces, zoom, pan]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      update(s => {
        const ns = s.namespaces.find(n => n.id === dragging.nsId);
        if (ns) {
          ns.x = Math.max(0, e.clientX / zoom - dragging.offsetX + pan.x / zoom);
          ns.y = Math.max(0, e.clientY / zoom - dragging.offsetY + pan.y / zoom);
        }
      });
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, update, zoom, pan]);

  // --- Pan ---
  const onBgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === "rect") {
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  useEffect(() => {
    if (!panning) return;
    const onMove = (e) => setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    const onUp = () => setPanning(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [panning, panStart]);

  // --- Zoom ---
  const onWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  // --- Generate commands ---
  const generateCommands = useCallback(() => {
    const cmds = [];
    cmds.push("#!/bin/bash", "# === Network Namespace Setup ===", "");
    namespaces.filter(n => !n.isDefault).forEach(ns => {
      cmds.push(`ip netns add ${ns.name}`);
    });
    if (namespaces.filter(n => !n.isDefault).length) cmds.push("");
    bridges.forEach(b => {
      const ns = namespaces.find(n => n.id === b.nsId);
      const prefix = ns && !ns.isDefault ? `ip netns exec ${ns.name} ` : "";
      cmds.push(`${prefix}ip link add ${b.name} type bridge`);
      cmds.push(`${prefix}ip link set ${b.name} up`);
      if (b.ip) cmds.push(`${prefix}ip addr add ${b.ip} dev ${b.name}`);
      cmds.push("");
    });
    veths.forEach(v => {
      cmds.push(`ip link add ${v.endA.name} type veth peer name ${v.endB.name}`);
      const nsA = namespaces.find(n => n.id === v.endA.nsId);
      const nsB = namespaces.find(n => n.id === v.endB.nsId);
      if (nsA && !nsA.isDefault) cmds.push(`ip link set ${v.endA.name} netns ${nsA.name}`);
      if (nsB && !nsB.isDefault) cmds.push(`ip link set ${v.endB.name} netns ${nsB.name}`);
      const pA = nsA && !nsA.isDefault ? `ip netns exec ${nsA.name} ` : "";
      const pB = nsB && !nsB.isDefault ? `ip netns exec ${nsB.name} ` : "";
      if (v.endA.bridge) {
        const br = bridges.find(b => b.id === v.endA.bridge);
        if (br) cmds.push(`${pA}ip link set ${v.endA.name} master ${br.name}`);
      }
      if (v.endA.ip) cmds.push(`${pA}ip addr add ${v.endA.ip} dev ${v.endA.name}`);
      cmds.push(`${pA}ip link set ${v.endA.name} up`);
      if (v.endB.bridge) {
        const br = bridges.find(b => b.id === v.endB.bridge);
        if (br) cmds.push(`${pB}ip link set ${v.endB.name} master ${br.name}`);
      }
      if (v.endB.ip) cmds.push(`${pB}ip addr add ${v.endB.ip} dev ${v.endB.name}`);
      cmds.push(`${pB}ip link set ${v.endB.name} up`);
      cmds.push("");
    });
    routes.forEach(r => {
      const ns = namespaces.find(n => n.id === r.nsId);
      const prefix = ns && !ns.isDefault ? `ip netns exec ${ns.name} ` : "";
      cmds.push(`${prefix}ip route add ${r.dest} via ${r.gateway}${r.iface ? ` dev ${r.iface}` : ""}`);
    });
    if (routes.length) cmds.push("");
    cmds.push("# === Verification ===");
    namespaces.filter(n => !n.isDefault).forEach(ns => {
      cmds.push(`ip netns exec ${ns.name} ip addr show`);
    });
    setCmdLog(cmds);
    setShowCmd(true);
  }, [namespaces, bridges, veths, routes]);

  // --- Add Namespace (with Docker) ---
  const addNs = () => {
    const idx = namespaces.length;
    setModal({
      type: "addNs",
      data: { name: `ns${idx + 1}`, color: NS_COLORS[idx % NS_COLORS.length] },
    });
  };

  const addBridge = () => {
    setModal({
      type: "addBridge",
      data: { name: `br${bridges.length}`, nsId: namespaces[0]?.id || "", ip: "" },
    });
  };

  const addVeth = () => {
    const idx = veths.length + 1;
    setModal({
      type: "addVeth",
      data: {
        name: `veth-pair-${idx}`,
        endAName: `veth${idx}a`, endANs: namespaces[0]?.id || "", endAIp: "", endABridge: "",
        endBName: `veth${idx}b`, endBNs: namespaces[1]?.id || namespaces[0]?.id || "", endBIp: "", endBBridge: "",
      },
    });
  };

  const addRoute = () => {
    setModal({
      type: "addRoute",
      data: { nsId: namespaces[0]?.id || "", dest: "", gateway: "", iface: "" },
    });
  };

  const confirmModal = async () => {
    if (!modal) return;
    const { type, data } = modal;

    if (type === "addNs") {
      // Execute in Docker
      if (dockerReady) {
        const result = await execAndLog(`ip netns add ${data.name}`);
        if (!result.success) { alert(`Failed: ${result.output}`); return; }
      }
      update(s => {
        const maxX = s.namespaces.reduce((m, n) => Math.max(m, n.x), 0);
        s.namespaces.push({
          id: uid(), name: data.name,
          x: s.namespaces.length === 0 ? 60 : maxX + NS_W + 60,
          y: 80, color: data.color, isDefault: false,
        });
      });

    } else if (type === "addBridge") {
      const ns = namespaces.find(n => n.id === data.nsId);
      if (dockerReady && ns) {
        const prefix = `ip netns exec ${ns.name}`;
        let r = await execAndLog(`${prefix} ip link add ${data.name} type bridge`);
        if (!r.success) { alert(`Failed: ${r.output}`); return; }
        await execAndLog(`${prefix} ip link set ${data.name} up`);
        if (data.ip) await execAndLog(`${prefix} ip addr add ${data.ip} dev ${data.name}`);
      }
      update(s => s.bridges.push({ id: uid(), name: data.name, nsId: data.nsId, ip: data.ip }));

    } else if (type === "addVeth") {
      if (dockerReady) {
        const nsA = namespaces.find(n => n.id === data.endANs);
        const nsB = namespaces.find(n => n.id === data.endBNs);

        // Create veth pair
        let r = await execAndLog(`ip link add ${data.endAName} type veth peer name ${data.endBName}`);
        if (!r.success) { alert(`Failed: ${r.output}`); return; }

        // Move to namespaces
        if (nsA) await execAndLog(`ip link set ${data.endAName} netns ${nsA.name}`);
        if (nsB) await execAndLog(`ip link set ${data.endBName} netns ${nsB.name}`);

        const pA = nsA ? `ip netns exec ${nsA.name}` : "";
        const pB = nsB ? `ip netns exec ${nsB.name}` : "";

        // Set bridge
        if (data.endABridge) {
          const br = bridges.find(b => b.id === data.endABridge);
          if (br) await execAndLog(`${pA} ip link set ${data.endAName} master ${br.name}`);
        }
        if (data.endBBridge) {
          const br = bridges.find(b => b.id === data.endBBridge);
          if (br) await execAndLog(`${pB} ip link set ${data.endBName} master ${br.name}`);
        }

        // Add IPs
        if (data.endAIp) await execAndLog(`${pA} ip addr add ${data.endAIp} dev ${data.endAName}`);
        if (data.endBIp) await execAndLog(`${pB} ip addr add ${data.endBIp} dev ${data.endBName}`);

        // Bring up
        await execAndLog(`${pA} ip link set ${data.endAName} up`);
        await execAndLog(`${pB} ip link set ${data.endBName} up`);
      }
      update(s => s.veths.push({
        id: uid(), name: data.name,
        endA: { id: uid(), name: data.endAName, nsId: data.endANs, ip: data.endAIp, bridge: data.endABridge || null },
        endB: { id: uid(), name: data.endBName, nsId: data.endBNs, ip: data.endBIp, bridge: data.endBBridge || null },
      }));

    } else if (type === "addRoute") {
      const ns = namespaces.find(n => n.id === data.nsId);
      if (dockerReady && ns) {
        const prefix = `ip netns exec ${ns.name}`;
        const dev = data.iface ? ` dev ${data.iface}` : "";
        await execAndLog(`${prefix} ip route add ${data.dest} via ${data.gateway}${dev}`);
      }
      update(s => s.routes.push({ id: uid(), nsId: data.nsId, dest: data.dest, gateway: data.gateway, iface: data.iface }));
    }
    setModal(null);
  };

  const deleteNs = async (id) => {
    const ns = namespaces.find(n => n.id === id);
    if (dockerReady && ns) {
      await execAndLog(`ip netns del ${ns.name}`);
    }
    update(s => {
      s.namespaces = s.namespaces.filter(n => n.id !== id);
      s.bridges = s.bridges.filter(b => b.nsId !== id);
      s.veths = s.veths.filter(v => v.endA.nsId !== id && v.endB.nsId !== id);
      s.routes = s.routes.filter(r => r.nsId !== id);
    });
    setSelected(null);
  };

  const deleteBridge = async (id) => {
    const br = bridges.find(b => b.id === id);
    if (dockerReady && br) {
      const ns = namespaces.find(n => n.id === br.nsId);
      if (ns) {
        await execAndLog(`ip netns exec ${ns.name} ip link del ${br.name}`);
      }
    }
    update(s => {
      s.bridges = s.bridges.filter(b => b.id !== id);
      s.veths.forEach(v => {
        if (v.endA.bridge === id) v.endA.bridge = null;
        if (v.endB.bridge === id) v.endB.bridge = null;
      });
    });
  };

  const deleteVeth = async (id) => {
    const v = veths.find(vv => vv.id === id);
    if (dockerReady && v) {
      // Deleting one end deletes both
      const nsA = namespaces.find(n => n.id === v.endA.nsId);
      if (nsA) {
        await execAndLog(`ip netns exec ${nsA.name} ip link del ${v.endA.name}`);
      }
    }
    update(s => { s.veths = s.veths.filter(v => v.id !== id); });
  };

  const deleteRoute = (id) => update(s => { s.routes = s.routes.filter(r => r.id !== id); });

  // --- Ping ---
  const openPingModal = () => {
    setPingModal({
      fromNs: namespaces[0]?.id || "",
      target: "",
      count: "3",
      result: null,
      loading: false,
    });
  };

  const executePing = async () => {
    if (!pingModal || !dockerReady) return;
    const ns = namespaces.find(n => n.id === pingModal.fromNs);
    if (!ns) return;

    setPingModal(prev => ({ ...prev, loading: true, result: null }));

    const cmd = `ip netns exec ${ns.name} ping -c ${pingModal.count} -W 2 ${pingModal.target}`;
    const result = await execAndLog(cmd);

    setPingModal(prev => ({ ...prev, loading: false, result }));
  };

  // --- Query ip addr / ip route ---
  const queryNsInfo = async (nsId) => {
    const ns = namespaces.find(n => n.id === nsId);
    if (!ns || !dockerReady) return;
    await execAndLog(`ip netns exec ${ns.name} ip addr show`);
    await execAndLog(`ip netns exec ${ns.name} ip route show`);
    setShowTerminal(true);
  };

  // --- Reset ---
  const resetAll = async () => {
    if (dockerReady) {
      // Delete all namespaces in Docker
      for (const ns of namespaces) {
        await execAndLog(`ip netns del ${ns.name}`);
      }
    }
    setState(defaultState());
    setSelected(null);
    setTerminalOutput([]);
  };

  const ifacePos = getInterfacePositions(namespaces, bridges, veths);

  const nsOptions = namespaces.map(n => ({ value: n.id, label: n.name }));
  const bridgeOptions = (nsId) => [{ value: "", label: "(none)" }, ...bridges.filter(b => b.nsId === nsId).map(b => ({ value: b.id, label: b.name }))];

  return (
    <div style={{ width: "100vw", height: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', system-ui, sans-serif", color: COLORS.text, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
      `}</style>

      {/* --- Top Bar --- */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon d={Icons.network} size={15} color="#fff" />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>netns<span style={{ color: COLORS.accent }}>viz</span></span>
        </div>
        <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />

        {/* Docker status */}
        {isElectron() && (
          <>
            {!dockerReady ? (
              <Btn small onClick={startDocker} disabled={dockerLoading} color={dockerLoading ? COLORS.textDim : COLORS.green}>
                {dockerLoading ? "⏳ 起動中..." : "🐳 Docker起動"}
              </Btn>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.green, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: COLORS.green, display: "inline-block" }} />
                Docker Ready
              </div>
            )}
            <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />
          </>
        )}

        <Btn small onClick={addNs} disabled={isElectron() && !dockerReady}><Icon d={Icons.plus} size={12} color="#fff" /> Namespace</Btn>
        <Btn small onClick={addBridge} color={COLORS.green} disabled={namespaces.length === 0}><Icon d={Icons.plus} size={12} color="#fff" /> Bridge</Btn>
        <Btn small onClick={addVeth} color={COLORS.orange} disabled={namespaces.length === 0}><Icon d={Icons.plus} size={12} color="#fff" /> Veth Pair</Btn>
        <Btn small onClick={addRoute} color={COLORS.purple} disabled={namespaces.length === 0}><Icon d={Icons.plus} size={12} color="#fff" /> Route</Btn>

        {dockerReady && (
          <>
            <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />
            <Btn small onClick={openPingModal} color={COLORS.cyan} disabled={namespaces.length === 0}><Icon d={Icons.play} size={12} color="#fff" /> Ping</Btn>
          </>
        )}

        <div style={{ flex: 1 }} />

        <Btn small ghost onClick={() => setShowTerminal(!showTerminal)}>
          <Icon d={Icons.terminal} size={12} color={COLORS.textMuted} /> ターミナル
        </Btn>
        <Btn small ghost onClick={generateCommands}><Icon d={Icons.code} size={12} color={COLORS.textMuted} /> コマンド生成</Btn>
        <Btn small ghost onClick={resetAll}><Icon d={Icons.x} size={12} color={COLORS.textMuted} /> リセット</Btn>

        <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* --- Main Area --- */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* --- Canvas --- */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <svg
            ref={svgRef}
            width="100%" height="100%"
            style={{ cursor: panning ? "grabbing" : "grab" }}
            onMouseDown={onBgMouseDown}
            onWheel={onWheel}
          >
            <rect width="100%" height="100%" fill={COLORS.bg} />
            <defs>
              <pattern id="grid" width={40 * zoom} height={40 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (40 * zoom)} y={pan.y % (40 * zoom)}>
                <circle cx={1} cy={1} r={0.5} fill="#1e293b" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Veth connections */}
              {veths.map(v => {
                const pA = ifacePos[v.endA.id];
                const pB = ifacePos[v.endB.id];
                if (!pA || !pB) return null;
                const midX = (pA.x + pB.x) / 2;
                const cp1x = pA.side === "right" ? pA.x + 80 : pA.x - 80;
                const cp2x = pB.side === "left" ? pB.x - 80 : pB.x + 80;
                return (
                  <g key={v.id}>
                    <path
                      d={`M${pA.x},${pA.y} C${cp1x},${pA.y} ${cp2x},${pB.y} ${pB.x},${pB.y}`}
                      stroke={COLORS.orange} strokeWidth={2} fill="none" strokeDasharray="6 4" opacity={0.6}
                    />
                    <circle cx={pA.x} cy={pA.y} r={4} fill={COLORS.orange} />
                    <circle cx={pB.x} cy={pB.y} r={4} fill={COLORS.orange} />
                    <text x={midX} y={Math.min(pA.y, pB.y) - 10} textAnchor="middle" fontSize={9} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">
                      {v.name}
                    </text>
                  </g>
                );
              })}

              {/* Namespace boxes */}
              {namespaces.map(ns => {
                const h = getNsHeight(ns, bridges, veths);
                const isSelected = selected === ns.id;
                return (
                  <g key={ns.id} onMouseDown={e => onMouseDown(e, ns.id)} style={{ cursor: "move" }}>
                    <rect x={ns.x + 3} y={ns.y + 3} width={NS_W} height={h} rx={10} fill="rgba(0,0,0,0.3)" />
                    <rect
                      x={ns.x} y={ns.y} width={NS_W} height={h} rx={10}
                      fill={COLORS.surface}
                      stroke={isSelected ? ns.color : COLORS.border}
                      strokeWidth={isSelected ? 2 : 1}
                      onClick={(e) => { e.stopPropagation(); setSelected(ns.id); }}
                    />
                    <rect x={ns.x} y={ns.y} width={NS_W} height={NS_HEADER} rx={10} fill={ns.color + "18"} />
                    <rect x={ns.x} y={ns.y + NS_HEADER - 1} width={NS_W} height={2} fill={ns.color + "30"} />
                    <circle cx={ns.x + 18} cy={ns.y + NS_HEADER / 2} r={5} fill={ns.color} />
                    <text x={ns.x + 32} y={ns.y + NS_HEADER / 2 + 1} dominantBaseline="middle" fontSize={13} fontWeight="700" fill={COLORS.text} fontFamily="'JetBrains Mono', monospace">
                      {ns.name}
                    </text>

                    {/* Info button */}
                    {dockerReady && (
                      <g onClick={(e) => { e.stopPropagation(); queryNsInfo(ns.id); }} style={{ cursor: "pointer" }}>
                        <rect x={ns.x + NS_W - 58} y={ns.y + 10} width={22} height={22} rx={4} fill="transparent" />
                        <text x={ns.x + NS_W - 50} y={ns.y + 22} fontSize={12} fill={COLORS.cyan} fontFamily="'JetBrains Mono', monospace" textAnchor="middle">i</text>
                      </g>
                    )}

                    {/* Delete btn */}
                    <g onClick={(e) => { e.stopPropagation(); deleteNs(ns.id); }} style={{ cursor: "pointer" }}>
                      <rect x={ns.x + NS_W - 32} y={ns.y + 10} width={22} height={22} rx={4} fill="transparent" />
                      <line x1={ns.x + NS_W - 25} y1={ns.y + 17} x2={ns.x + NS_W - 17} y2={ns.y + 25} stroke={COLORS.textDim} strokeWidth={1.5} />
                      <line x1={ns.x + NS_W - 17} y1={ns.y + 17} x2={ns.x + NS_W - 25} y2={ns.y + 25} stroke={COLORS.textDim} strokeWidth={1.5} />
                    </g>

                    {/* Interfaces inside */}
                    {(() => {
                      let idx = 0;
                      const items = [];
                      bridges.filter(b => b.nsId === ns.id).forEach(b => {
                        const y = ns.y + NS_HEADER + idx * NS_ITEM_H;
                        items.push(
                          <g key={b.id}>
                            <rect x={ns.x + 8} y={y + 4} width={NS_W - 16} height={NS_ITEM_H - 6} rx={4} fill={COLORS.greenGlow} />
                            <text x={ns.x + 20} y={y + NS_ITEM_H / 2 + 2} dominantBaseline="middle" fontSize={11} fill={COLORS.green} fontFamily="'JetBrains Mono', monospace" fontWeight="600">
                              🌉 {b.name}
                            </text>
                            {b.ip && (
                              <text x={ns.x + NS_W - 50} y={y + NS_ITEM_H / 2 + 2} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">
                                {b.ip}
                              </text>
                            )}
                            <g onClick={(e) => { e.stopPropagation(); deleteBridge(b.id); }} style={{ cursor: "pointer" }}>
                              <text x={ns.x + NS_W - 24} y={y + NS_ITEM_H / 2 + 2} dominantBaseline="middle" fontSize={10} fill={COLORS.red} style={{ opacity: 0.5 }}>✕</text>
                            </g>
                          </g>
                        );
                        idx++;
                      });

                      veths.forEach(v => {
                        [["endA", "➡"], ["endB", "⬅"]].forEach(([end, arrow]) => {
                          if (v[end].nsId === ns.id) {
                            const y = ns.y + NS_HEADER + idx * NS_ITEM_H;
                            const brName = v[end].bridge ? bridges.find(b => b.id === v[end].bridge)?.name : null;
                            items.push(
                              <g key={v[end].id}>
                                <rect x={ns.x + 8} y={y + 4} width={NS_W - 16} height={NS_ITEM_H - 6} rx={4} fill={COLORS.orangeGlow} />
                                <text x={ns.x + 20} y={y + NS_ITEM_H / 2 + 2} dominantBaseline="middle" fontSize={11} fill={COLORS.orange} fontFamily="'JetBrains Mono', monospace" fontWeight="600">
                                  🔗 {v[end].name}
                                </text>
                                <text x={ns.x + NS_W - 50} y={y + NS_ITEM_H / 2 + 2} dominantBaseline="middle" textAnchor="end" fontSize={10} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">
                                  {v[end].ip || ""}{brName ? ` → ${brName}` : ""}
                                </text>
                                <g onClick={(e) => { e.stopPropagation(); deleteVeth(v.id); }} style={{ cursor: "pointer" }}>
                                  <text x={ns.x + NS_W - 24} y={y + NS_ITEM_H / 2 + 2} dominantBaseline="middle" fontSize={10} fill={COLORS.red} style={{ opacity: 0.5 }}>✕</text>
                                </g>
                              </g>
                            );
                            idx++;
                          }
                        });
                      });
                      return items;
                    })()}
                  </g>
                );
              })}

              {/* Empty state */}
              {namespaces.length === 0 && (
                <text x={300} y={200} textAnchor="middle" fontSize={14} fill={COLORS.textDim} fontFamily="'JetBrains Mono', monospace">
                  {dockerReady ? "「+ Namespace」で始めましょう" : isElectron() ? "まず「🐳 Docker起動」をクリック" : "Electronで起動するとDockerと連携できます"}
                </text>
              )}
            </g>
          </svg>

          {/* Routes panel */}
          {routes.length > 0 && (
            <div style={{ position: "absolute", bottom: 16, left: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, maxWidth: 400, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ color: COLORS.purple, fontWeight: 700, marginBottom: 6, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>⛓ Routes</div>
              {routes.map(r => {
                const ns = namespaces.find(n => n.id === r.nsId);
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", color: COLORS.textMuted }}>
                    <span style={{ color: ns?.color || COLORS.text }}>{ns?.name}</span>
                    <span>→</span>
                    <span style={{ color: COLORS.text }}>{r.dest}</span>
                    <span>via</span>
                    <span style={{ color: COLORS.text }}>{r.gateway}</span>
                    {r.iface && <span>dev {r.iface}</span>}
                    <span onClick={() => deleteRoute(r.id)} style={{ color: COLORS.red, cursor: "pointer", opacity: 0.5, marginLeft: 4 }}>✕</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Help hint */}
          <div style={{ position: "absolute", bottom: 16, right: 16, fontSize: 10, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", background: COLORS.surface + "cc", padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
            ドラッグ: ノード移動 · 背景ドラッグ: パン · スクロール: ズーム
          </div>
        </div>

        {/* --- Terminal Panel --- */}
        {showTerminal && (
          <div style={{ width: 400, borderLeft: `1px solid ${COLORS.border}`, background: COLORS.bg, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.green, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                <Icon d={Icons.terminal} size={12} color={COLORS.green} /> Terminal Log
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small ghost onClick={() => setTerminalOutput([])}>Clear</Btn>
                <Btn small ghost onClick={() => setShowTerminal(false)}><Icon d={Icons.x} size={10} color={COLORS.textMuted} /></Btn>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
              {terminalOutput.length === 0 && (
                <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", padding: 8 }}>
                  コマンドの実行ログがここに表示されます
                </div>
              )}
              {terminalOutput.map((entry, i) => (
                <div key={i} style={{ marginBottom: 12, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                  <div style={{ color: COLORS.textDim, fontSize: 9, marginBottom: 2 }}>{entry.time}</div>
                  <div style={{ color: COLORS.cyan }}>$ {entry.cmd}</div>
                  {entry.output && (
                    <pre style={{
                      color: entry.success ? COLORS.green : COLORS.red,
                      margin: "4px 0 0 0", padding: 0, fontSize: 10,
                      whiteSpace: "pre-wrap", wordBreak: "break-all",
                      lineHeight: 1.5,
                    }}>
                      {entry.output}
                    </pre>
                  )}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      {modal?.type === "addNs" && (
        <Modal title="Add Namespace" onClose={() => setModal(null)}>
          <Input label="Name" value={modal.data.name} onChange={v => setModal({ ...modal, data: { ...modal.data, name: v } })} mono placeholder="ns-name" />
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {NS_COLORS.map(c => (
              <div key={c} onClick={() => setModal({ ...modal, data: { ...modal.data, color: c } })}
                style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: modal.data.color === c ? "2px solid #fff" : "2px solid transparent", transition: "all 0.15s" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn ghost small onClick={() => setModal(null)}>キャンセル</Btn>
            <Btn small onClick={confirmModal}>追加</Btn>
          </div>
        </Modal>
      )}

      {modal?.type === "addBridge" && (
        <Modal title="Add Bridge" onClose={() => setModal(null)}>
          <Input label="Name" value={modal.data.name} onChange={v => setModal({ ...modal, data: { ...modal.data, name: v } })} mono />
          <Select label="Namespace" value={modal.data.nsId} onChange={v => setModal({ ...modal, data: { ...modal.data, nsId: v } })} options={nsOptions} />
          <Input label="IP Address" value={modal.data.ip} onChange={v => setModal({ ...modal, data: { ...modal.data, ip: v } })} mono placeholder="10.0.0.1/24" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn ghost small onClick={() => setModal(null)}>キャンセル</Btn>
            <Btn small color={COLORS.green} onClick={confirmModal}>追加</Btn>
          </div>
        </Modal>
      )}

      {modal?.type === "addVeth" && (
        <Modal title="Add Veth Pair" onClose={() => setModal(null)} width={500}>
          <Input label="Pair Name" value={modal.data.name} onChange={v => setModal({ ...modal, data: { ...modal.data, name: v } })} mono />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: COLORS.orange, fontWeight: 700, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>END A</div>
              <Input label="Interface Name" value={modal.data.endAName} onChange={v => setModal({ ...modal, data: { ...modal.data, endAName: v } })} mono />
              <Select label="Namespace" value={modal.data.endANs} onChange={v => setModal({ ...modal, data: { ...modal.data, endANs: v } })} options={nsOptions} />
              <Input label="IP Address" value={modal.data.endAIp} onChange={v => setModal({ ...modal, data: { ...modal.data, endAIp: v } })} mono placeholder="10.0.0.2/24" />
              <Select label="Bridge" value={modal.data.endABridge} onChange={v => setModal({ ...modal, data: { ...modal.data, endABridge: v } })} options={bridgeOptions(modal.data.endANs)} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: COLORS.orange, fontWeight: 700, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>END B</div>
              <Input label="Interface Name" value={modal.data.endBName} onChange={v => setModal({ ...modal, data: { ...modal.data, endBName: v } })} mono />
              <Select label="Namespace" value={modal.data.endBNs} onChange={v => setModal({ ...modal, data: { ...modal.data, endBNs: v } })} options={nsOptions} />
              <Input label="IP Address" value={modal.data.endBIp} onChange={v => setModal({ ...modal, data: { ...modal.data, endBIp: v } })} mono placeholder="10.0.0.3/24" />
              <Select label="Bridge" value={modal.data.endBBridge} onChange={v => setModal({ ...modal, data: { ...modal.data, endBBridge: v } })} options={bridgeOptions(modal.data.endBNs)} />
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
          <Select label="Namespace" value={modal.data.nsId} onChange={v => setModal({ ...modal, data: { ...modal.data, nsId: v } })} options={nsOptions} />
          <Input label="Destination" value={modal.data.dest} onChange={v => setModal({ ...modal, data: { ...modal.data, dest: v } })} mono placeholder="default or 192.168.1.0/24" />
          <Input label="Gateway" value={modal.data.gateway} onChange={v => setModal({ ...modal, data: { ...modal.data, gateway: v } })} mono placeholder="10.0.0.1" />
          <Input label="Interface (optional)" value={modal.data.iface} onChange={v => setModal({ ...modal, data: { ...modal.data, iface: v } })} mono placeholder="veth1b" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn ghost small onClick={() => setModal(null)}>キャンセル</Btn>
            <Btn small color={COLORS.purple} onClick={confirmModal}>追加</Btn>
          </div>
        </Modal>
      )}

      {/* --- Ping Modal --- */}
      {pingModal && (
        <Modal title="Ping テスト" onClose={() => setPingModal(null)}>
          <Select label="送信元 Namespace" value={pingModal.fromNs} onChange={v => setPingModal(prev => ({ ...prev, fromNs: v }))} options={nsOptions} />
          <Input label="宛先 IP" value={pingModal.target} onChange={v => setPingModal(prev => ({ ...prev, target: v }))} mono placeholder="10.0.0.1" />
          <Input label="回数" value={pingModal.count} onChange={v => setPingModal(prev => ({ ...prev, count: v }))} mono placeholder="3" />
          {pingModal.result && (
            <pre style={{
              background: COLORS.bg, padding: 12, borderRadius: 8, fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6,
              color: pingModal.result.success ? COLORS.green : COLORS.red,
              border: `1px solid ${COLORS.border}`,
              maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", marginBottom: 12,
            }}>
              {pingModal.result.output}
            </pre>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn ghost small onClick={() => setPingModal(null)}>閉じる</Btn>
            <Btn small color={COLORS.cyan} onClick={executePing} disabled={pingModal.loading || !pingModal.target}>
              {pingModal.loading ? "⏳ 実行中..." : "🏓 Ping実行"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* --- Command Output --- */}
      {showCmd && (
        <Modal title="生成されたコマンド" onClose={() => setShowCmd(false)} width={600}>
          <pre style={{
            background: COLORS.bg, color: COLORS.green, padding: 16, borderRadius: 8,
            fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
            overflow: "auto", maxHeight: 400, border: `1px solid ${COLORS.border}`,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {cmdLog.join("\n")}
          </pre>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Btn small ghost onClick={() => setShowCmd(false)}>閉じる</Btn>
            <Btn small onClick={() => { navigator.clipboard?.writeText(cmdLog.join("\n")); }}>📋 コピー</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
