// lite-VRT snapshot runner for netns-viz refactor (cmd_142 Phase 0)
// Spawns electron with --snapshot flags; electron/main.js handles the heavy lifting.
// Note: output file is named localstorage.json for continuity with the original spec,
// but the source is window.sessionStorage (see App.jsx L16/L52/L534).
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function parseArg(name, fallback) {
  const prefix = `--${name}=`
  const hit = process.argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

const OUT_DIR = path.resolve(ROOT, parseArg('out', 'tests/refactor_baseline'))
const SAMPLE  = path.resolve(ROOT, parseArg('sample', 'samples/ch01_vlan.json'))
const OUT_JSON = path.join(OUT_DIR, 'localstorage.json')
const OUT_HTML = path.join(OUT_DIR, 'svg.html')

await fs.mkdir(OUT_DIR, { recursive: true })

const sampleStat = await fs.stat(SAMPLE).catch(() => null)
if (!sampleStat) {
  console.error(`[snapshot] sample not found: ${SAMPLE}`)
  process.exit(1)
}

const distIndex = path.join(ROOT, 'dist', 'index.html')
const distStat = await fs.stat(distIndex).catch(() => null)
if (!distStat) {
  console.error(`[snapshot] dist/index.html not found. Run 'npm run build' first.`)
  process.exit(1)
}

const electronBin = path.join(
  ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron',
)

const args = [
  '.',
  `--snapshot=${SAMPLE}`,
  `--snapshot-json=${OUT_JSON}`,
  `--snapshot-html=${OUT_HTML}`,
]

const env = {
  ...process.env,
  VITE_DEV_SERVER_URL: '',
  NETNS_SNAPSHOT_MODE: '1',
}

console.log(`[snapshot] spawning electron ${args.join(' ')}`)
const child = spawn(electronBin, args, { cwd: ROOT, stdio: 'inherit', env })

const code = await new Promise((resolve) => child.once('exit', resolve))
if (code !== 0) {
  console.error(`[snapshot] electron exited with code ${code}`)
  process.exit(code ?? 1)
}

for (const f of [OUT_JSON, OUT_HTML]) {
  const st = await fs.stat(f).catch(() => null)
  if (!st || st.size === 0) {
    console.error(`[snapshot] missing or empty output: ${f}`)
    process.exit(2)
  }
  console.log(`[snapshot] ok ${path.relative(ROOT, f)} (${st.size} bytes)`)
}
console.log('[snapshot] done')
