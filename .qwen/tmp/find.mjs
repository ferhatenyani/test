// Region finder: locate colour blobs in a reference capture, report CSS px.
import sharp from 'sharp'
import path from 'node:path'

const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const file = process.argv[2]
const mode = process.argv[3]
const arg = process.argv.slice(4).map(Number)

const img = await sharp(path.join(SHOTS, file)).rotate()
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const at = (x, y) => {
  const i = (y * W + x) * info.channels
  return [data[i], data[i + 1], data[i + 2]]
}
const hexs = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const d = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const css = (n) => (n / 1.5).toFixed(1)

if (mode === 'bandprofile') {
  // for each column, first y (from y0) where colour stops matching `target`
  const target = [parseInt(arg[0], 16), parseInt(arg[1], 16), parseInt(arg[2], 16)]
  const y0 = arg[3] ?? 40
  const out = []
  for (let x = 0; x < W; x += 10) {
    let y = y0
    while (y < H && d(at(x, y), target) <= 30) y++
    out.push(`${x}:${y}`)
  }
  console.log('col:bottomEdge(device)  ' + out.join('  '))
}

if (mode === 'findcolor') {
  // bounding box of pixels within tol of target colour, inside an optional window
  const target = [parseInt(arg[0], 16), parseInt(arg[1], 16), parseInt(arg[2], 16)]
  const tol = arg[3] ?? 26
  const win = arg.length > 7 ? arg.slice(4, 8) : [0, 0, W - 1, H - 1]
  const [x0, y0, x1, y1] = win
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, n = 0
  const rowHits = new Map()
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (d(at(x, y), target) <= tol) {
        n++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        rowHits.set(y, (rowHits.get(y) || 0) + 1)
      }
  if (!n) {
    console.log(`no pixels near ${hexs(target)} tol${tol} in ${win}`)
  } else {
    console.log(`bbox ${hexs(target)} tol${tol} window${win}: x ${minX}..${maxX} (css ${css(minX)}..${css(maxX)})  y ${minY}..${maxY} (css ${css(minY)}..${css(maxY)})  w ${maxX - minX + 1}=${css(maxX - minX + 1)}css h ${maxY - minY + 1}=${css(maxY - minY + 1)}css  n=${n}`)
    const dense = [...rowHits.entries()].filter(([, c]) => c > (maxX - minX) * 0.5).map(([y]) => y)
    if (dense.length) console.log(`  full-width rows: ${dense[0]}..${dense[dense.length - 1]} (css ${css(dense[0])}..${css(dense[dense.length - 1])})`)
  }
}

if (mode === 'rowruns') {
  // run-length of "is this near target" along a row -> gives left/right edges
  const y = arg[0]
  const target = [parseInt(arg[1], 16), parseInt(arg[2], 16), parseInt(arg[3], 16)]
  const tol = arg[4] ?? 26
  let run = null
  for (let x = 0; x < W; x++) {
    const hit = d(at(x, y), target) <= tol
    if (hit && !run) run = x
    if (!hit && run !== null) { console.log(`y=${y} run x ${run}..${x - 1}  css ${css(run)}..${css(x - 1)}  w=${css(x - run)}`); run = null }
  }
  if (run !== null) console.log(`y=${y} run x ${run}..${W - 1}`)
}

if (mode === 'colruns') {
  const x = arg[0]
  const target = [parseInt(arg[1], 16), parseInt(arg[2], 16), parseInt(arg[3], 16)]
  const tol = arg[4] ?? 26
  let run = null
  for (let y = 0; y < H; y++) {
    const hit = d(at(x, y), target) <= tol
    if (hit && !run) run = y
    if (!hit && run !== null) { console.log(`x=${x} run y ${run}..${y - 1}  css ${css(run)}..${css(y - 1)}  h=${css(y - run)}`); run = null }
  }
  if (run !== null) console.log(`x=${x} run y ${run}..${H - 1}`)
}

if (mode === 'samples') {
  for (let i = 0; i < arg.length; i += 2) console.log(`(${arg[i]},${arg[i + 1]}) css(${css(arg[i])},${css(arg[i + 1])}) = ${hexs(at(arg[i], arg[i + 1]))}`)
}
