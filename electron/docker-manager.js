import Docker from 'dockerode'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const docker = new Docker()
const CONTAINER_NAME = 'netns-viz-lab'
const IMAGE_NAME = 'netns-viz-lab:latest'

let container = null

async function findContainerByName() {
  try {
    const target = docker.getContainer(CONTAINER_NAME)
    await target.inspect()
    return target
  } catch (e) {
    return null
  }
}

async function getLiveContainer() {
  if (container) {
    try {
      const info = await container.inspect()
      if (info.State?.Running) return container
    } catch (e) {
      // fall through and try to re-acquire by name
    }
  }

  const byName = await findContainerByName()
  if (!byName) {
    container = null
    return null
  }

  try {
    const info = await byName.inspect()
    if (!info.State?.Running) return null
    container = byName
    return container
  } catch (e) {
    container = null
    return null
  }
}

async function buildImage() {
  const dockerfilePath = path.join(__dirname, '..', 'docker')

  // Dockerfileがあるか確認
  if (!fs.existsSync(path.join(dockerfilePath, 'Dockerfile'))) {
    console.log('No Dockerfile found, using ubuntu:24.04 directly')
    return 'ubuntu:24.04'
  }

  // イメージが既にあるか確認
  try {
    const image = docker.getImage(IMAGE_NAME)
    await image.inspect()
    console.log('Image already exists')
    return IMAGE_NAME
  } catch (e) {
    // イメージがないのでビルド
  }

  console.log('Building image...')
  const stream = await docker.buildImage(
    { context: dockerfilePath, src: ['Dockerfile'] },
    { t: IMAGE_NAME }
  )

  await new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })

  console.log('Image built')
  return IMAGE_NAME
}

async function cleanupNetns() {
  // ip -all netns delete で一括削除を試みる
  const result = await execInContainer('ip -all netns delete')
  if (!result.success) {
    // 失敗した場合は1つずつ削除
    console.log('ip -all netns delete failed, falling back to individual deletion')
    const list = await execInContainer('ip netns list')
    if (list.success && list.output.trim()) {
      const names = list.output.trim().split('\n').map(line => line.split(/\s/)[0]).filter(Boolean)
      for (const ns of names) {
        await execInContainer(`ip netns del ${ns}`)
      }
    }
  }
  console.log('Netns cleanup done')
}

export async function startContainer() {
  const existing = await findContainerByName()

  if (existing) {
    const info = await existing.inspect()

    if (info.State?.Running) {
      // コンテナが動いている → そのまま再利用、netnsだけクリーンアップ
      console.log('Container already running, reusing')
      container = existing
      await cleanupNetns()
      return { success: true }
    }

    // コンテナが停止している → 起動して再利用
    console.log('Container exists but stopped, starting')
    container = existing
    await container.start()
    console.log('Container started')
    await cleanupNetns()

    // ツールが入っているか確認
    const check = await execInContainer('ip -V')
    if (!check.success) {
      console.log('Installing tools...')
      await execInContainer('apt-get update -qq && apt-get install -y -qq iproute2 iputils-ping')
    }

    return { success: true }
  }

  // コンテナが存在しない → 新規作成
  const imageName = await buildImage()

  container = await docker.createContainer({
    Image: imageName,
    name: CONTAINER_NAME,
    Cmd: ['sleep', 'infinity'],
    HostConfig: { Privileged: true },
  })

  await container.start()
  console.log('Container started')

  // ツールが入っているか確認
  const check = await execInContainer('ip -V')
  if (!check.success) {
    console.log('Installing tools...')
    await execInContainer('apt-get update -qq && apt-get install -y -qq iproute2 iputils-ping')
  }

  return { success: true }
}

export async function stopContainer() {
  const target = container || await findContainerByName()
  if (!target) return { success: true }
  try {
    const info = await target.inspect()
    if (info.State?.Running) await target.stop()
    container = null
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function execInContainer(cmd) {
  const target = await getLiveContainer()
  if (!target) return { success: false, output: 'Container not running' }

  try {
    const exec = await target.exec({
      Cmd: ['bash', '-c', cmd],
      AttachStdout: true,
      AttachStderr: true,
    })

    const stream = await exec.start({ Detach: false, Tty: false })

    const output = await new Promise((resolve, reject) => {
      const chunks = []
      const timeout = setTimeout(() => resolve(chunks.join('')), 30000)

      stream.on('data', (chunk) => {
        const buf = Buffer.from(chunk)
        let i = 0
        while (i < buf.length) {
          if (i + 8 <= buf.length) {
            const size = buf.readUInt32BE(i + 4)
            if (i + 8 + size <= buf.length) {
              chunks.push(buf.slice(i + 8, i + 8 + size).toString('utf8'))
              i += 8 + size
            } else {
              chunks.push(buf.slice(i).toString('utf8').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ''))
              break
            }
          } else {
            chunks.push(buf.slice(i).toString('utf8').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ''))
            break
          }
        }
      })

      stream.on('end', () => { clearTimeout(timeout); resolve(chunks.join('')) })
      stream.on('error', (err) => { clearTimeout(timeout); reject(err) })
    })

    const inspect = await exec.inspect()
    return { success: inspect.ExitCode === 0, output: output.trim() }
  } catch (e) {
    return { success: false, output: e.message }
  }
}

// ANSIエスケープシーケンス除去
function stripAnsi(text) {
  return text
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')   // CSI sequences ([?2004h, 色コード等)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '') // OSC sequences (ターミナルタイトル等)
    .replace(/\r/g, '')
}

// 永続シェルセッション
const activeStreams = new Map()

export async function openShell(sessionId, shellCmd, onData) {
  const target = await getLiveContainer()
  if (!target) { onData('__SHELL_EXIT__'); return }

  try {
    const exec = await target.exec({
      Cmd: ['bash', '-c', shellCmd],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    })

    const stream = await exec.start({ Detach: false, Tty: true, hijack: true, stdin: true })
    activeStreams.set(sessionId, { stream, exec, markerPending: null, buffer: '', onData })

    // リスナーを先に登録してから初期化コマンドを送信（エコーバックを確実にキャッチするため）
    stream.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      const session = activeStreams.get(sessionId)
      if (!session) return

      // コマンド実行中でない → 全て破棄（初期化出力・プロンプト等のノイズ）
      if (!session.markerPending) return

      session.buffer += text
      // ANSIストリップ後のバッファでマーカーを検索（エスケープシーケンスがマーカーを分断する場合に対応）
      const strippedBuf = stripAnsi(session.buffer)
      const markerIdx = strippedBuf.indexOf(session.markerPending)
      if (markerIdx !== -1) {
        // マーカー検出 → コマンド完了
        const marker = session.markerPending
        let output = strippedBuf.substring(0, markerIdx).replace(/\n+$/, '')
        // コマンドエコーとechoマーカーコマンドを除去（readline無効化が効かなかった場合のフォールバック）
        if (session.sentCmd) {
          const lines = output.split('\n')
          // 先頭のコマンドエコーを除去
          if (lines.length && lines[0].trim() === session.sentCmd.trim()) lines.shift()
          // echo marker コマンドのエコーを除去
          const echoLine = `echo '${marker}'`
          const echoIdx = lines.findIndex(l => l.trim() === echoLine)
          if (echoIdx !== -1) lines.splice(echoIdx, 1)
          output = lines.join('\n').replace(/^\n+|\n+$/g, '')
        }
        if (output) onData(output)
        session.markerPending = null
        session.sentCmd = null
        session.buffer = ''
        onData('\n__CMD_DONE__')
      } else {
        // マーカー未検出 → マーカー行以外の完全な行をフラッシュ
        const lines = strippedBuf.split('\n')
        const markerPrefix = '__NSVIZ_DONE_'
        let flushUpTo = 0
        // 最後の要素は未完成行の可能性があるので除外（i < length - 1）
        for (let i = 0; i < lines.length - 1; i++) {
          if (lines[i].trimStart().startsWith(markerPrefix)) break
          flushUpTo = i + 1
        }
        if (flushUpTo > 0) {
          onData(lines.slice(0, flushUpTo).join('\n') + '\n')
          session.buffer = lines.slice(flushUpTo).join('\n')
        }
      }
    })

    stream.on('end', () => {
      activeStreams.delete(sessionId)
      onData('\n__SHELL_EXIT__')
    })

    stream.on('error', (err) => {
      activeStreams.delete(sessionId)
      onData(`\n[error] ${err.message}\n__SHELL_EXIT__`)
    })

    // TTYエコーとプロンプトを抑制
    stream.write("stty -echo\nPS1=''\nPS2=''\n")
  } catch (e) {
    onData(`[error] ${e.message}\n__SHELL_EXIT__`)
  }
}

export async function sendCommand(sessionId, cmd) {
  const session = activeStreams.get(sessionId)
  if (!session || !session.stream) return { success: false, error: 'Session not found' }

  const marker = `__NSVIZ_DONE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}__`
  session.markerPending = marker
  session.sentCmd = cmd
  session.buffer = ''

  try {
    // コマンドとマーカーechoを2行に分けて書き込む
    // Ctrl+Cでcmdが中断されてもechoが実行される
    session.stream.write(`${cmd}\necho '${marker}'\n`)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function closeShell(sessionId) {
  const session = activeStreams.get(sessionId)
  if (!session) return { success: true }

  // 即座にMapから削除しリスナーを解除（古いセッションの__SHELL_EXIT__が新セッションに影響しないように）
  activeStreams.delete(sessionId)
  try {
    session.stream.removeAllListeners()
    session.stream.write('exit\n')
    setTimeout(() => {
      try { session.stream.destroy() } catch (e) {}
    }, 500)
  } catch (e) {
    try { session.stream.destroy() } catch (e2) {}
  }
  return { success: true }
}

export async function killSession(sessionId) {
  const session = activeStreams.get(sessionId)
  if (!session || !session.stream) return { success: false }

  try {
    // Ctrl+C (SIGINT) を送信。シェル自体は殺さない
    session.stream.write('\x03')
    session.markerPending = null
    session.buffer = ''
    // 少し待ってから __CMD_DONE__ を送信
    if (session.onData) {
      setTimeout(() => session.onData('\n__CMD_DONE__'), 200)
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function writeSession(sessionId, data) {
  const session = activeStreams.get(sessionId)
  if (!session || !session.stream) return { success: false, error: 'Session not found' }

  try {
    session.stream.write(data)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function reconnectContainer() {
  const target = await findContainerByName()
  if (!target) {
    container = null
    return { success: false, error: 'Container not found' }
  }

  try {
    const info = await target.inspect()
    if (!info.State?.Running) {
      container = null
      return { success: false, error: 'Container is not running' }
    }
    container = target
    return { success: true }
  } catch (e) {
    container = null
    return { success: false, error: e.message }
  }
}
