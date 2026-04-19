import { useState, useRef, useEffect } from "react";
import { COLORS } from "../../theme.js";

export const HostTerminal = ({ tabId, dockerReady, isElectron, openShell, closeShell, sendCommand, killSession, writeSession, onShellData }) => {
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
