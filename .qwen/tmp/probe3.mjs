// Fast feature probe for a login reference/render image.
// node probe3.mjs <path-or-capture-name> [outfile]
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'

const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const argIn = process.argv[2]
const out = process.argv[3]
const src = fs.existsSync(argIn) ? argIn : path.join(SHOTS, argIn)
const img = await sharp(src).rotate()
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const SCALE = W === 540 ? 1.5 : 591 / 394
const CH = info.channels
const L = []
const log = (s) => L.push(s)
const at = (x, y) => {
  const i = (y * W + x) * CH
  return [data[i], data[i + 1], data[i + 2]]
}
const hexs = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const D = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const K = (n) => +(n / SCALE).toFixed(1)
const rgbOf = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]

log(`# ${path.basename(src)}  ${W}x${H} device  = ${K(W)}x${K(H)} CSS  scale ${SCALE}`)

function colEdges(x, thr = 20) {
  const e = []
  let prev = at(x, 0)
  for (let y = 1; y < H; y++) {
    const c = at(x, y)
    if (D(c, prev) > thr) e.push(`y=${String(y).padStart(4)} css=${String(K(y)).padStart(6)} ${hexs(prev)}->${hexs(c)}`)
    prev = c
  }
  return e
}
function rowEdges(y, thr = 20) {
  const e = []
  let prev = at(0, y)
  for (let x = 1; x < W; x++) {
    const c = at(x, y)
    if (D(c, prev) > thr) e.push(`x=${String(x).padStart(4)} css=${String(K(x)).padStart(6)} ${hexs(prev)}->${hexs(c)}`)
    prev = c
  }
  return e
}

log('\n## vertical edges, columns')
for (const x of [8, 30, 60, 90, Math.round(W / 2), W - 60, W - 8]) {
  log(`\n-- x=${x} css=${K(x)}`)
  for (const l of colEdges(x)) log('   ' + l)
}
log('\n## horizontal edges, rows')
for (const y of [50, 150, 250, 300, 500, 560, 600, 700, 800, 830, 900, 1000, 1080, 1150]) {
  if (y >= H) continue
  log(`\n-- y=${y} css=${K(y)}: ` + rowEdges(y).join('  |  '))
}

// green band profile: topmost+bottommost brand pixel per column
log('\n## brand-green band, per column (device css)')
const g = rgbOf('009577')
const p1 = []
for (let x = 0; x < W; x += 6) {
  let top = -1
  let bot = -1
  for (let y = 0; y < H; y++) if (D(at(x, y), g) < 46) { if (top < 0) top = y; bot = y }
  if (top >= 0) p1.push(`x=${String(x).padStart(3)}(${String(K(x)).padStart(5)}) ${top}..${bot} css ${K(top)}..${K(bot)}`)
}
log('  ' + p1.join('\n  '))

// colour bands: rows where >25% of the row is near a colour
function fillBands(h, thr = 12, minFrac = 0.2) {
  const t = rgbOf(h)
  const rows = []
  for (let y = 0; y < H; y++) {
    let n = 0
    for (let x = 0; x < W; x += 2) if (D(at(x, y), t) <= thr) n++
    rows.push(n * 2)
  }
  const bands = []
  rows.forEach((n, y) => {
    if (n > W * minFrac) {
      const l = bands.at(-1)
      if (l && y - l[1] <= 3) l[1] = y
      else bands.push([y, y])
    }
  })
  log(`\n## fill ${h} (tol ${thr}) bands`)
  for (const [s, e] of bands) {
    const mid = (s + e) >> 1
    let a = -1
    const spans = []
    for (let x = 0; x <= W; x++) {
      const hit = x < W && D(at(x, mid), t) <= thr
      if (hit && a < 0) a = x
      if (!hit && a >= 0) { spans.push(`x ${a}..${x - 1} css ${K(a)}..${K(x - 1)} w=${K(x - a)}`); a = -1 }
    }
    log(`  y ${s}..${e}  css ${K(s)}..${K(e)}  h=${K(e - s + 1)}  |  ${spans.join(' ;; ')}`)
  }
}
fillBands('e8eaee', 10)
fillBands('2a2e3a', 10)
fillBands('ffffff', 4, 0.35)
fillBands('009577', 30, 0.2)

// dark ink row bands
log('\n## ink (lum<145) row bands')
const inkCount = []
for (let y = 0; y < H; y++) {
  let n = 0
  for (let x = 0; x < W; x += 1) {
    const p = at(x, y)
    if ((p[0] + p[1] + p[2]) / 3 < 145) n++
  }
  inkCount.push(n)
}
const bands = []
inkCount.forEach((n, y) => {
  if (n > 8) {
    const l = bands.at(-1)
    if (l && y - l[1] <= 5) { l[1] = y; l[2] = Math.max(l[2], n) }
    else bands.push([y, y, n])
  }
})
for (const [s, e, mx] of bands) {
  let a = 1e9
  let b = -1
  for (let y = s; y <= e; y++)
    for (let x = 0; x < W; x++) {
      const p = at(x, y)
      if ((p[0] + p[1] + p[2]) / 3 < 145) { a = Math.min(a, x); b = Math.max(b, x) }
    }
  log(`  y ${String(s).padStart(4)}..${String(e).padStart(4)} css ${K(s)}..${K(e)} h=${K(e - s + 1)} | x ${a}..${b} css ${K(a)}..${K(b)} w=${K(b - a)} | peak ${mx}px`)
}

// light ink on dark (for dark theme text): lum > 200 within card areas
log('\n## light-ink (lum>200) row bands  [dark theme text]')
const liteCount = []
for (let y = 0; y < H; y++) {
  let n = 0
  for (let x = 0; x < W; x++) {
    const p = at(x, y)
    if ((p[0] + p[1] + p[2]) / 3 > 205) n++
  }
  liteCount.push(n)
}
const lb = []
liteCount.forEach((n, y) => {
  if (n > 8 && n < W * 0.5) {
    const l = lb.at(-1)
    if (l && y - l[1] <= 5) { l[1] = y; l[2] = Math.max(l[2], n) }
    else lb.push([y, y, n])
  }
})
for (const [s, e, mx] of lb) log(`  y ${s}..${e} css ${K(s)}..${K(e)} h=${K(e - s + 1)} | peak ${mx}px`)

fs.writeFileSync(out || 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/out.txt', L.join('\n'))
console.log(`wrote ${L.length} lines -> ${out || 'out.txt'}`)
