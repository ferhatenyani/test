// Throwaway probe: read exact device-px edges out of a reference capture.
// usage: node probe.mjs <capture.jpeg> col <x> [y0 y1]
//        node probe.mjs <capture.jpeg> row <y> [x0 x1]
//        node probe.mjs <capture.jpeg> box <x0> <y0> <x1> <y1>
import sharp from 'sharp'
import path from 'node:path'

const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const file = process.argv[2]
const mode = process.argv[3]
const arg = process.argv.slice(4).map(Number)

const img = await sharp(path.join(SHOTS, file)).rotate()
const meta = await img.clone().metadata()
const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const at = (x, y) => {
  const i = (y * W + x) * info.channels
  return [data[i], data[i + 1], data[i + 2]]
}
const hexs = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const d = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))

console.log(`${file}  ${W}x${H} device px  = ${W / 1.5}x${H / 1.5} CSS px`)

if (mode === 'col') {
  const x = arg[0]
  const y0 = arg.length > 1 ? arg[1] : 0
  const y1 = arg.length > 2 ? arg[2] : H - 1
  let prev = at(x, y0)
  for (let y = y0 + 1; y <= y1; y++) {
    const c = at(x, y)
    if (d(c, prev) > 14) {
      console.log(`y=${String(y).padStart(4)} css=${(y / 1.5).toFixed(1)}  ${hexs(prev)} -> ${hexs(c)}`)
      prev = c
    }
  }
}
if (mode === 'row') {
  const y = arg[0]
  const x0 = arg.length > 1 ? arg[1] : 0
  const x1 = arg.length > 2 ? arg[2] : W - 1
  let prev = at(x0, y)
  for (let x = x0 + 1; x <= x1; x++) {
    const c = at(x, y)
    if (d(c, prev) > 14) {
      console.log(`x=${String(x).padStart(4)} css=${(x / 1.5).toFixed(1)}  ${hexs(prev)} -> ${hexs(c)}`)
      prev = c
    }
  }
}
if (mode === 'box') {
  const [x0, y0, x1, y1] = arg
  const tally = new Map()
  for (let y = y0; y <= y1; y += 2)
    for (let x = x0; x <= x1; x += 2) {
      const k = hexs(at(x, y))
      tally.set(k, (tally.get(k) || 0) + 1)
    }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  for (const [c, n] of top) console.log(`${c}  ${n}`)
}
