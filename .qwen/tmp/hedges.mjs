/**
 * Scratch: for each device row, find the leftmost/rightmost x where a 5px-wide
 * window mean departs from a reference colour by > eps. Beats JPEG noise the
 * way a single-pixel read cannot.
 *   node .qwen/tmp/hedges.mjs <y0> <y1> <step> [ref] [eps]
 */
import sharp from 'sharp'
const SRC = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/WhatsApp Image 2026-10-25 at 18.35.12.jpeg'
const [y0, y1, step] = process.argv.slice(2, 5).map(Number)
const ref = (process.argv[5] || 'f5f6f8').replace('#', '')
const eps = Number(process.argv[6] || 3)
const { data, info } = await sharp(SRC).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, CH = info.channels
const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
const rc = [0, 2, 4].map((i) => parseInt(ref.slice(i, i + 2), 16))
const dd = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const win = (x, y) => { let r = 0, g = 0, b = 0; for (let k = 0; k < 5; k++) { const c = at(Math.min(W - 1, x + k), y); r += c[0]; g += c[1]; b += c[2] } return [r / 5, g / 5, b / 5] }
const c1 = (n) => (n / 1.5).toFixed(1)
console.log(`ref=${ref} eps=${eps}; edges in dev px (CSS in parentheses)`)
for (let y = y0; y <= y1; y += step) {
  let L = -1, R = -1
  for (let x = 0; x < W - 5; x++) if (dd(win(x, y), rc) > eps) { L = x; break }
  for (let x = W - 6; x >= 0; x--) if (dd(win(x, y), rc) > eps) { R = x + 4; break }
  console.log(`  y=${String(y).padStart(4)} css=${c1(y).padStart(6)}  L=${String(L).padStart(3)} (${c1(L)})  R=${String(R).padStart(3)} (${R >= 0 ? c1(R + 1) : ''})  w=${R - L + 1}dev/${c1(R - L + 1)}css`)
}
