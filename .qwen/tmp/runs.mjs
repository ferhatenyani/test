/**
 * Scratch run-based edge probe for reference captures (NOT part of the harness).
 * Reports device px and CSS px (device / 1.5).
 *
 *   node .qwen/tmp/runs.mjs <file> row <y> [x0 x1] [minRun]
 *   node .qwen/tmp/runs.mjs <file> col <x> [y0 y1] [minRun]
 *   node .qwen/tmp/runs.mjs <file> box <x0> <y0> <x1> <y1>   top colour tallies
 *   node .qwen/tmp/runs.mjs <file> colmean <x0> <x1> <y0> <y1> [minRun]  column-averaged vertical scan
 *   node .qwen/tmp/runs.mjs <file> rowmean <y0> <y1> <x0> <x1> [minRun]  row-averaged horizontal scan
 */
import sharp from 'sharp'
import path from 'node:path'

const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const [file, mode, ...args] = process.argv.slice(2)
const img = await sharp(path.join(SHOTS, file)).rotate().ensureAlpha()
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const CH = info.channels
const at = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return [0, 0, 0]
  const i = (y * W + x) * CH
  return [data[i], data[i + 1], data[i + 2]]
}
const hexs = (c) => '#' + c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
const dd = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const css = (n) => (n / 1.5).toFixed(1).padStart(6)

function reportRuns(get, n, offset, minRun, thr) {
  const out = []
  let start = 0
  let cur = get(0)
  for (let i = 1; i < n; i++) {
    const c = get(i)
    if (dd(c, cur) > thr) {
      out.push([start, i - 1, cur])
      cur = c
      start = i
    }
  }
  out.push([start, n - 1, cur])
  console.log(`--- runs (device ${offset}..${offset + n - 1}) ---`)
  for (const [a, b, c] of out) {
    const len = b - a + 1
    if (len < minRun) continue
    console.log(
      `  dev ${String(offset + a).padStart(4)}..${String(offset + b).padEnd(4)}  len ${String(len).padStart(3)} dev / ${css(len)} css   start css=${css(offset + a)} end css=${css(offset + b + 1)}  ${hexs(c)}`
    )
  }
}

const A = args.map(Number)
if (mode === 'row') {
  const [y, x0 = 0, x1 = W - 1, minRun = 1] = A
  reportRuns((i) => at(x0 + i, y), x1 - x0 + 1, x0, minRun, 16)
} else if (mode === 'col') {
  const [x, y0 = 0, y1 = H - 1, minRun = 1] = A
  reportRuns((i) => at(x, y0 + i), y1 - y0 + 1, y0, minRun, 16)
}
else if (mode === 'rowmean') {
  // average colours across rows y0..y1, then find runs along x
  const [y0, y1, x0, x1, minRun] = [A[0], A[1], A[2] ?? 0, A[3] ?? W - 1, A[4] ?? 1]
  reportRuns((i) => {
    const acc = [0, 0, 0]
    for (let y = y0; y <= y1; y++) { const c = at(x0 + i, y); acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2] }
    return acc.map((v) => v / (y1 - y0 + 1))
  }, x1 - x0 + 1, x0, minRun, 12)
} else if (mode === 'colmean') {
  const [x0, x1, y0, y1, minRun] = [A[0], A[1], A[2] ?? 0, A[3] ?? H - 1, A[4] ?? 1]
  reportRuns((i) => {
    const acc = [0, 0, 0]
    for (let x = x0; x <= x1; x++) { const c = at(x, y0 + i); acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2] }
    return acc.map((v) => v / (x1 - x0 + 1))
  }, y1 - y0 + 1, y0, minRun, 12)
} else if (mode === 'box') {
  const [x0, y0, x1, y1] = A
  const tally = new Map()
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = hexs(at(x, y))
    tally.set(k, (tally.get(k) || 0) + 1)
  }
  for (const [c, n] of [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${c}  ${n}`)
} else if (mode === 'px') {
  console.log(hexs(at(A[0], A[1])))
} else {
  console.log('unknown mode')
}
console.log(`${file}: ${W}x${H} device = ${css(W)}x${css(H)} CSS`)
