const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI;

export function openShell(sid, cmd) {
  if (!isElectron() || !window.electronAPI.docker?.openShell) return;
  return window.electronAPI.docker.openShell(sid, cmd);
}

export function closeShell(sid) {
  if (!isElectron() || !window.electronAPI.docker?.closeShell) return;
  return window.electronAPI.docker.closeShell(sid);
}

export async function sendCommand(sid, cmd) {
  if (!isElectron()) return { ok: false, error: 'not electron' };
  return window.electronAPI.docker.sendCommand(sid, cmd);
}

export async function killSession(sid) {
  if (!isElectron()) return { ok: false, error: 'not electron' };
  return window.electronAPI.docker.killSession(sid);
}

export async function writeSession(sid, text) {
  if (!isElectron()) return { ok: false, error: 'not electron' };
  return window.electronAPI.docker.writeSession(sid, text);
}

export function onShellData(handler) {
  if (!isElectron() || !window.electronAPI.stream) return;
  return window.electronAPI.stream.onData(handler);
}
