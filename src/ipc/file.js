const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI;

export async function saveFile(data) {
  if (!isElectron()) return { ok: false, error: 'not electron' };
  return window.electronAPI.file.save(data);
}

export async function loadFile() {
  if (!isElectron()) return { ok: false, error: 'not electron' };
  return window.electronAPI.file.load();
}
