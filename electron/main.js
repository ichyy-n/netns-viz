import { app, BrowserWindow, ipcMain, dialog, powerMonitor } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { startContainer, stopContainer, execInContainer, openShell, sendCommand, closeShell, killSession, writeSession, reconnectContainer } from './docker-manager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.whenReady().then(() => {
  powerMonitor.on('resume', async () => {
    try {
      const result = await reconnectContainer()
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.webContents.send('docker-status', {
          source: 'resume',
          ok: Boolean(result?.success),
          error: result?.error || null,
        })
      }
    } catch (e) {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.webContents.send('docker-status', {
          source: 'resume',
          ok: false,
          error: e.message,
        })
      }
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

let isQuitting = false
app.on('will-quit', (e) => {
  if (isQuitting) return
  e.preventDefault()
  isQuitting = true
  stopContainer()
    .catch((err) => console.error('stopContainer error:', err))
    .finally(() => app.exit(0))
})

// --- Docker IPC ---
ipcMain.handle('docker-start', async () => await startContainer())
ipcMain.handle('docker-stop', async () => await stopContainer())
ipcMain.handle('docker-exec', async (event, cmd) => await execInContainer(cmd))
ipcMain.handle('docker-reconnect', async () => await reconnectContainer())

// --- Shell IPC ---
ipcMain.handle('docker-open-shell', async (event, sessionId, shellCmd) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  openShell(sessionId, shellCmd, (data) => {
    try {
      win.webContents.send('stream-data', sessionId, data)
    } catch (e) {}
  })
  return { success: true }
})

ipcMain.handle('docker-send-command', async (event, sessionId, cmd) => {
  return sendCommand(sessionId, cmd)
})

ipcMain.handle('docker-close-shell', async (event, sessionId) => {
  return closeShell(sessionId)
})

ipcMain.handle('docker-kill-session', async (event, sessionId) => {
  return killSession(sessionId)
})

ipcMain.handle('docker-write-session', async (event, sessionId, data) => {
  return writeSession(sessionId, data)
})

// --- File IPC ---
ipcMain.handle('file-save', async (event, data) => {
  const win = BrowserWindow.getFocusedWindow()
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'トポロジを保存',
    defaultPath: 'topology.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (canceled || !filePath) return { success: false }
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  return { success: true, filePath }
})

ipcMain.handle('file-load', async (event) => {
  const win = BrowserWindow.getFocusedWindow()
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'トポロジを開く',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return { success: false }
  const content = await fs.readFile(filePaths[0], 'utf-8')
  return { success: true, data: JSON.parse(content) }
})
