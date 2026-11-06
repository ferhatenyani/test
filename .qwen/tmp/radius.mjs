/**
 * Scratch: corner-radius probe. For a rounded rect, walks rows from the top
 * edge and prints the leftmost "ink" x (inset). Fits R from inset(dy).
 *   node .qwen/tmp/radius.mjs <file> <x0> <x1> <ytop> <ybot> <refColor> [thr]
 */
import sharp from 'sharp'
import path from 'node:path'
const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const [file, x0, x1, ytop, ybot, ref, thr] = [
  process.argv[2], ...process.argv.slice(3, 7).map(Number), process.argv[7], Number(process.argv[8] || 14),
]
const img = await sharp(path.join(SHOTS, file)).rotate().ensureAlpha()
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const W = info.width, CH = info.channels
const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
const h = ref.replace('#', '')
const refc = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
const dd = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
console.log(`walk rows ${ytop}..${ybot} (dev), ref=${ref}, thr=${thr}; x in CSS px`)
for (let y = ytop; y <= ybot; y++) {
  let lx = -1
  for (let x = x0; x <= x1; x++) if (dd(at(x, y), refc) > thr) { lx = x; break }
  console.log(`  devY=${String(y).padStart(4)} cssY=${(y / 1.5).toFixed(1)}  leftInk dev=${lx} css=${(lx / 1.5).toFixed(2)}`)
}
