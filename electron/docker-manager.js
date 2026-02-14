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

export async function startContainer() {
  // 既存コンテナを削除
  try {
    const existing = docker.getContainer(CONTAINER_NAME)
    const info = await existing.inspect()
    if (info.State.Running) await existing.stop()
    await existing.remove()
  } catch (e) {}

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
    await target.remove()
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

// ストリーミング実行
const activeStreams = new Map()

export async function execStreaming(cmd, sessionId, onData) {
  const target = await getLiveContainer()
  if (!target) { onData('[error] Container not running\n__STREAM_END__'); return }

  try {
    // コマンドをラップして、PIDファイルに書き出す
    const wrappedCmd = `bash -c 'echo $$ > /tmp/pid_${sessionId}; exec ${cmd.replace(/'/g, "'\\''")}'`

    const exec = await target.exec({
      Cmd: ['bash', '-c', wrappedCmd],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    })

    const stream = await exec.start({ Detach: false, Tty: true })
    activeStreams.set(sessionId, { stream, exec, cmd })

    stream.on('data', (chunk) => {
      onData(chunk.toString('utf8'))
    })

    stream.on('end', () => {
      activeStreams.delete(sessionId)
      onData('\n__STREAM_END__')
    })

    stream.on('error', (err) => {
      activeStreams.delete(sessionId)
      onData(`\n[error] ${err.message}\n__STREAM_END__`)
    })
  } catch (e) {
    onData(`[error] ${e.message}\n__STREAM_END__`)
  }
}

export async function killSession(sessionId) {
  const target = await getLiveContainer()
  if (!target) return { success: false }

  const session = activeStreams.get(sessionId)
  if (!session) return { success: false }

  try {
    // コンテナ内のプロセスをkillする
    const killExec = await target.exec({
      Cmd: ['bash', '-c', `cat /tmp/pid_${sessionId} 2>/dev/null && kill -- -$(cat /tmp/pid_${sessionId}) 2>/dev/null; rm -f /tmp/pid_${sessionId}`],
      AttachStdout: true,
      AttachStderr: true,
    })
    await killExec.start({ Detach: false })
  } catch (e) {
    console.log('Kill error (non-fatal):', e.message)
  }

  try { session.stream.destroy() } catch (e) {}
  activeStreams.delete(sessionId)
  return { success: true }
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
