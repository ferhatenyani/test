// Feature probe for a 540x1170 (or 591x1280) login image — capture OR render.
// node probe2.mjs <path-or-capture-name>
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'

const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const arg = process.argv[2]
const src = fs.existsSync(arg) ? arg : path.join(SHOTS, arg)
const img = await sharp(src).rotate()
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const SCALE = W === 540 ? 1.5 : 591 / 394
const at = (x, y) => {
  const i = (y * W + x) * info.channels
  return [data[i], data[i + 1], data[i + 2]]
}
const hexs = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const D = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const K = (n) => +(n / SCALE).toFixed(1)
const near = (h) => (c) => D(c, [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)])

console.log(`# ${path.basename(src)}  ${W}x${H} device  = ${K(W)}x${K(H)} CSS  scale ${SCALE}`)

// --- vertical profile down the centre column and down x=20 (outside the cards)
for (const x of [12, Math.round(W / 2), Math.round(W * 0.9)]) {
  const edges = []
  let prev = at(x, 0)
  for (let y = 1; y < H; y++) {
    const c = at(x, y)
    if (D(c, prev) > 20) edges.push(`${y}(${K(y)}) ${hexs(prev)}->${hexs(c)}`)
    prev = c
  }
  console.log(`\n## col x=${x} css=${K(x)} edges:\n  ${edges.join('\n  ')}`)
}

// --- horizontal profile on rows of interest
for (const y of [60, 150, 250, 560, 700, 830, 900, 1000, 1080]) {
  if (y >= H) continue
  const edges = []
  let prev = at(0, y)
  for (let x = 1; x < W; x++) {
    const c = at(x, y)
    if (D(c, prev) > 20) edges.push(`${x}(${K(x)}) ${hexs(prev)}->${hexs(c)}`)
    prev = c
  }
  console.log(`\n## row y=${y} css=${K(y)} edges:\n  ${edges.join('  |  ')}`)
}

// --- green band: bottom edge per column (rounded corners) + top edge per column
const isGreen = near('009577')
const isGreenT = (c) => D(c, [0, 149, 119]) < 46
console.log('\n## band top/bottom per column (device px, css)')
const prof = []
for (let x = 0; x < W; x += 6) {
  let top = -1
  let bot = -1
  for (let y = 0; y < H; y++) {
    if (isGreenT(at(x, y))) { if (top < 0) top = y; bot = y }
  }
  if (top >= 0) prof.push(`x${x}(${K(x)}) ${top}..${bot} ${K(top)}..${K(bot)}`)
}
console.log('  ' + prof.join('\n  '))

// --- pill fill runs (light grey #e8eaee / dark #2a2e3a) along columns
for (const h of ['e8eaee', '2a2e3a']) {
  const f = near(h)
  const rowsWith = []
  for (let y = 0; y < H; y++) {
    let n = 0
    for (let x = 0; x < W; x++) if (f(at(x, y))) n++
    if (n > W * 0.25) rowsWith.push(y)
  }
  if (!rowsWith.length) continue
  const bands = []
  for (const y of rowsWith) {
    const l = bands.at(-1)
    if (l && y - l[1] <= 3) l[1] = y
    else bands.push([y, y])
  }
  console.log(`\n## fill ${h} bands: ` + bands.map(([s, e]) => `y ${s}..${e} css ${K(s)}..${K(e)} h=${K(e - s + 1)}`).join(' | '))
  for (const [s, e] of bands) {
    const mid = (s + e) >> 1
    let a = -1
    for (let x = 0; x < W; x++) {
      const hit = f(at(x, mid))
      if (hit && a < 0) a = x
      if (!hit && a >= 0) { console.log(`   row ${mid}: x ${a}..${x - 1} css ${K(a)}..${K(x - 1)} w=${K(x - a)}`); a = -1 }
    }
  }
}

// --- dark ink text bands (labels, title, footer)
const inkRows = []
for (let y = 0; y < H; y++) {
  let n = 0
  for (let x = 0; x < W; x++) {
    const p = at(x, y)
    if ((p[0] + p[1] + p[2]) / 3 < 145) n++
  }
  inkRows.push(n)
}
console.log('\n## ink row profile (rows with >8 dark px)')
const bands = []
inkRows.forEach((n, y) => {
  if (n > 8) {
    const l = bands.at(-1)
    if (l && y - l[1] <= 4) { l[1] = y; l[2] = Math.max(l[2], n) }
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
  console.log(`  y ${s}..${e} css ${K(s)}..${K(e)} h=${K(e - s + 1)} | x ${a}..${b} css ${K(a)}..${K(b)} w=${K(b - a)} | peakInkPx ${mx}`)
}
