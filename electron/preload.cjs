const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  docker: {
    start: () => ipcRenderer.invoke('docker-start'),
    stop: () => ipcRenderer.invoke('docker-stop'),
    reconnect: () => ipcRenderer.invoke('docker-reconnect'),
    exec: (cmd) => ipcRenderer.invoke('docker-exec', cmd),
    execStream: (cmd, sessionId) => ipcRenderer.invoke('docker-exec-stream', cmd, sessionId),
    killSession: (sessionId) => ipcRenderer.invoke('docker-kill-session', sessionId),
    writeSession: (sessionId, data) => ipcRenderer.invoke('docker-write-session', sessionId, data),
  },

  stream: {
    onData: (callback) => {
      const handler = (event, sessionId, data) => callback(sessionId, data)
      ipcRenderer.on('stream-data', handler)
      return () => ipcRenderer.removeListener('stream-data', handler)
    },
  },

  status: {
    onDockerStatus: (callback) => {
      const handler = (event, payload) => callback(payload)
      ipcRenderer.on('docker-status', handler)
      return () => ipcRenderer.removeListener('docker-status', handler)
    },
  },

  file: {
    save: (data) => ipcRenderer.invoke('file-save', data),
    load: () => ipcRenderer.invoke('file-load'),
  },

  // netns操作を分かりやすい関数にまとめる
  netns: {
    add: (name) => ipcRenderer.invoke('docker-exec', `ip netns add ${name}`),
    del: (name) => ipcRenderer.invoke('docker-exec', `ip netns del ${name}`),
    list: () => ipcRenderer.invoke('docker-exec', 'ip netns list'),
    exec: (ns, cmd) => ipcRenderer.invoke('docker-exec', `ip netns exec ${ns} ${cmd}`),
  },

  network: {
    addVeth: (a, b) => ipcRenderer.invoke('docker-exec', `ip link add ${a} type veth peer name ${b}`),
    setNs: (iface, ns) => ipcRenderer.invoke('docker-exec', `ip link set ${iface} netns ${ns}`),
    addBridge: (name) => ipcRenderer.invoke('docker-exec', `ip link add ${name} type bridge`),
    setUp: (iface, ns) => {
      const prefix = ns ? `ip netns exec ${ns} ` : ''
      return ipcRenderer.invoke('docker-exec', `${prefix}ip link set ${iface} up`)
    },
    addAddr: (iface, addr, ns) => {
      const prefix = ns ? `ip netns exec ${ns} ` : ''
      return ipcRenderer.invoke('docker-exec', `${prefix}ip addr add ${addr} dev ${iface}`)
    },
    setMaster: (iface, bridge, ns) => {
      const prefix = ns ? `ip netns exec ${ns} ` : ''
      return ipcRenderer.invoke('docker-exec', `${prefix}ip link set ${iface} master ${bridge}`)
    },
    addRoute: (dest, gw, iface, ns) => {
      const prefix = ns ? `ip netns exec ${ns} ` : ''
      const dev = iface ? ` dev ${iface}` : ''
      return ipcRenderer.invoke('docker-exec', `${prefix}ip route add ${dest} via ${gw}${dev}`)
    },
    ping: (target, ns, count = 3) => {
      const prefix = ns ? `ip netns exec ${ns} ` : ''
      return ipcRenderer.invoke('docker-exec', `${prefix}ping -c ${count} -W 2 ${target}`)
    },
    ipAddr: (ns) => {
      const prefix = ns ? `ip netns exec ${ns} ` : ''
      return ipcRenderer.invoke('docker-exec', `${prefix}ip addr show`)
    },
    ipRoute: (ns) => {
      const prefix = ns ? `ip netns exec ${ns} ` : ''
      return ipcRenderer.invoke('docker-exec', `${prefix}ip route show`)
    },
  },
})
