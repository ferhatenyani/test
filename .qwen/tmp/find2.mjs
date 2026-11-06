// Region finder v2: colour blobs / edges in a reference capture, reported in CSS px.
// node find2.mjs <capture> bbox <rrggbb> [tol] [x0 y0 x1 y1]
// node find2.mjs <capture> hspan <rrggbb> <y> [tol]        -> runs along a row
// node find2.mjs <capture> vspan <rrggbb> <x> [tol]        -> runs along a col
// node find2.mjs <capture> darktext <x0> <y0> <x1> <y1>    -> rows/cols with dark glyphs
// node find2.mjs <capture> px <x> <y> [...]                -> sample colours
import sharp from 'sharp'
import path from 'node:path'

const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const file = process.argv[2]
const mode = process.argv[3]
const rest = process.argv.slice(4)

const img = await sharp(path.join(SHOTS, file)).rotate()
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const at = (x, y) => {
  const i = (y * W + x) * info.channels
  return [data[i], data[i + 1], data[i + 2]]
}
const hexs = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const D = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const C = (n) => +(n / 1.5).toFixed(1)
const rgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]

console.log(`# ${file} ${W}x${H} device = ${C(W)}x${C(H)} CSS`)

if (mode === 'bbox') {
  const t = rgb(rest[0])
  const tol = Number(rest[1] ?? 26)
  const [x0, y0, x1, y1] = [Number(rest[2] ?? 0), Number(rest[3] ?? 0), Number(rest[4] ?? W - 1), Number(rest[5] ?? H - 1)]
  let a = 1e9, b = 1e9, c = -1, e = -1, n = 0
  const rows = new Map()
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (D(at(x, y), t) <= tol) {
        n++; a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, y); e = Math.max(e, y)
        rows.set(y, (rows.get(y) || 0) + 1)
      }
  if (!n) console.log(`none near #${rest[0]} tol${tol}`)
  else {
  console.log(`bbox #${rest[0]} tol${tol} win[${x0},${y0},${x1},${y1}] -> x ${a}..${c} css ${C(a)}..${C(c)} | y ${b}..${e} css ${C(b)}..${C(e)} | w ${c - a + 1}=${C(c - a + 1)} h ${e - b + 1}=${C(e - b + 1)} | n=${n}`)
  const dense = [...rows.entries()].filter(([, k]) => k > (c - a) * 0.6).map(([y]) => y)
  if (dense.length) console.log(`  solid rows ${dense[0]}..${dense.at(-1)} css ${C(dense[0])}..${C(dense.at(-1))}`)
}

if (mode === 'hspan' || mode === 'vspan') {
  const t = rgb(rest[0])
  const fixed = Number(rest[1])
  const tol = Number(rest[2] ?? 26)
  const len = mode === 'hspan' ? W : H
  let run = null
  for (let i = 0; i < len; i++) {
    const hit = D(mode === 'hspan' ? at(i, fixed) : at(fixed, i), t) <= tol
    if (hit && run === null) run = i
    if (!hit && run !== null) { console.log(`${mode === 'hspan' ? `y=${fixed} x` : `x=${fixed} y`} ${run}..${i - 1}  css ${C(run)}..${C(i - 1)}  size ${C(i - run)}`); run = null }
  }
  if (run !== null) console.log(`open run to ${len - 1} from ${run} css ${C(run)}`)
}

if (mode === 'darktext') {
  const [x0, y0, x1, y1] = rest.map(Number)
  // a pixel is "ink" if it is much darker than the local page bg
  const rowHits = new Map()
  const colHits = new Map()
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const p = at(x, y)
      const lum = (p[0] + p[1] + p[2]) / 3
      if (lum < 150) { rowHits.set(y, (rowHits.get(y) || 0) + 1); colHits.set(x, (colHits.get(x) || 0) + 1) }
    }
  const rs = [...rowHits.keys()].sort((m, n) => m - n)
  const cs = [...colHits.keys()].sort((m, n) => m - n)
  console.log(`ink rows ${rs[0]}..${rs.at(-1)} css ${C(rs[0])}..${C(rs.at(-1))} | ink cols ${cs[0]}..${cs.at(-1)} css ${C(cs[0])}..${C(cs.at(-1))}`)
  // group contiguous row bands
  const bands = []
  for (const y of rs) {
    const last = bands.at(-1)
    if (last && y - last[1] <= 2) last[1] = y
    else bands.push([y, y])
  }
  for (const [s, e] of bands) console.log(`  band y ${s}..${e} css ${C(s)}..${C(e)} h=${C(e - s + 1)}`)
}

if (mode === 'px') {
  for (let i = 0; i < rest.length; i += 2) {
    const x = Number(rest[i]), y = Number(rest[i + 1])
    console.log(`(${x},${y}) css(${C(x)},${C(y)}) ${hexs(at(x, y))}`)
  }
}
