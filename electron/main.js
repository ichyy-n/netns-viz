import { app, BrowserWindow, ipcMain, dialog, powerMonitor } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'url'
import { startContainer, stopContainer, execInContainer, openShell, sendCommand, closeShell, killSession, writeSession, closeAllShells, reconnectContainer } from './docker-manager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- snapshot mode (cmd_142 Phase 0 lite-VRT) ---
// When invoked with --snapshot=<sample.json>, run a headless snapshot capture and exit.
// Production paths (createWindow, powerMonitor, will-quit) are skipped in this mode.
const argv = process.argv.slice(2)
function getSnapshotArg(key) {
  const prefix = `--${key}=`
  const hit = argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : null
}
const SNAPSHOT_SAMPLE = getSnapshotArg('snapshot')
const SNAPSHOT_JSON   = getSnapshotArg('snapshot-json')
const SNAPSHOT_HTML   = getSnapshotArg('snapshot-html')
const IS_SNAPSHOT     = Boolean(SNAPSHOT_SAMPLE && SNAPSHOT_JSON && SNAPSHOT_HTML)
const GUI_STATE_KEY   = 'netns-viz:gui-state:v1'

async function runSnapshot() {
  const sampleRaw = await fs.readFile(SNAPSHOT_SAMPLE, 'utf-8')
  JSON.parse(sampleRaw) // validate

  const distIndex = path.join(__dirname, '..', 'dist', 'index.html')

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  // Load the real app first so the origin (file://) matches when we
  // write sessionStorage. about:blank would give a different origin
  // (see gunshi P3/P9: sessionStorage is scoped per origin).
  await win.loadFile(distIndex)

  // Let React commit its initial render and settle state-persistence useEffects
  // before we overwrite sessionStorage. Otherwise a trailing state-write could
  // clobber our sample between setItem and reload.
  await new Promise((r) => setTimeout(r, 200))

  await win.webContents.executeJavaScript(
    `window.sessionStorage.setItem(${JSON.stringify(GUI_STATE_KEY)}, ${JSON.stringify(sampleRaw)}); true;`,
  )

  // Reload so App.jsx picks up the sample via loadGuiState() on mount.
  const reloaded = new Promise((resolve) => win.webContents.once('did-finish-load', resolve))
  win.webContents.reload()
  await reloaded

  // Wait for the main topology SVG to render (poll up to 15s).
  // The page also contains small <svg> Icon components, so pick the largest.
  await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000
      const tick = () => {
        const svgs = Array.from(document.querySelectorAll('svg'))
        const biggest = svgs.reduce((a, b) => (b.outerHTML.length > (a?.outerHTML.length || 0) ? b : a), null)
        if (biggest && biggest.outerHTML.length > 2000) return resolve(true)
        if (Date.now() > deadline) return reject(new Error('svg did not settle (biggest=' + (biggest?.outerHTML.length || 0) + ')'))
        setTimeout(tick, 100)
      }
      tick()
    })
  `)

  const pickMainSvg = `
    (() => {
      const svgs = Array.from(document.querySelectorAll('svg'))
      return svgs.reduce((a, b) => (b.outerHTML.length > (a?.outerHTML.length || 0) ? b : a), null)?.outerHTML || ''
    })()
  `
  const [storage, svgHtml] = await Promise.all([
    win.webContents.executeJavaScript(
      `window.sessionStorage.getItem(${JSON.stringify(GUI_STATE_KEY)})`,
    ),
    win.webContents.executeJavaScript(pickMainSvg),
  ])

  if (!storage) throw new Error('sessionStorage empty after render')

  await fs.mkdir(path.dirname(SNAPSHOT_JSON), { recursive: true })
  await fs.writeFile(
    SNAPSHOT_JSON,
    JSON.stringify(JSON.parse(storage), null, 2),
    'utf-8',
  )
  await fs.writeFile(SNAPSHOT_HTML, svgHtml, 'utf-8')
}

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

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

if (IS_SNAPSHOT) {
  app.whenReady().then(runSnapshot).then(
    () => app.exit(0),
    (err) => {
      console.error('[snapshot] failed:', err)
      app.exit(3)
    },
  )
} else {
  app.whenReady().then(createWindow)
}

app.whenReady().then(() => {
  if (IS_SNAPSHOT) return
  powerMonitor.on('resume', async () => {
    closeAllShells()
    try {
      const result = await reconnectContainer()
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.webContents.send('docker-status', {
          source: 'resume',
          ok: Boolean(result?.success),
          error: result?.error || null,
          restarted: Boolean(result?.restarted),
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
  if (IS_SNAPSHOT) return
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

let isQuitting = false
app.on('will-quit', (e) => {
  if (IS_SNAPSHOT) return
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
    } catch { /* ignore */ }
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
  return { success: true, data: JSON.parse(content), filePath: filePaths[0] }
})
