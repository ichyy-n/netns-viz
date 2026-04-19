const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI;

export async function dockerStart() {
  if (!isElectron()) return { ok: false, error: 'not electron' };
  return window.electronAPI.docker.start();
}

export async function dockerExec(cmd) {
  if (!isElectron()) return { ok: false, error: 'not electron' };
  return window.electronAPI.docker.exec(cmd);
}

export function onDockerStatus(handler) {
  if (!isElectron() || !window.electronAPI.status?.onDockerStatus) return;
  return window.electronAPI.status.onDockerStatus(handler);
}
