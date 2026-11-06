/**
 * Scratch: contiguous horizontal-band detector. For every device row, mean the
 * colour across an x-range and group rows whose mean is within `eps` of the
 * page background (#f5f6f8) vs not. Prints band extents in dev + CSS px.
 *   node .qwen/tmp/bands.mjs <file> [x0 x1] [eps]
 */
import sharp from 'sharp'
const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const file = process.argv[2]
const x0 = Number(process.argv[3] ?? 40)
const x1 = Number(process.argv[4] ?? 550)
const eps = Number(process.argv[5] ?? 3)
const { data, info } = await sharp(`${SHOTS}/${file}`).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, CH = info.channels
const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
const hex = (c) => '#' + c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
const PAGE = [0xf5, 0xf6, 0xf8]
const dd = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const rowMean = (y) => {
  let r = 0, g = 0, b = 0
  for (let x = x0; x <= x1; x++) { const c = at(x, y); r += c[0]; g += c[1]; b += c[2] }
  return [r / (x1 - x0 + 1), g / (x1 - x0 + 1), b / (x1 - x0 + 1)]
}
const flags = []
for (let y = 0; y < info.height; y++) flags.push(dd(rowMean(y), PAGE) > eps ? 1 : 0)
const c1 = (n) => (n / 1.5).toFixed(1)
console.log(`bands differing from page bg #f5f6f8 by >${eps} (x ${x0}..${x1} dev = css ${c1(x0)}..${c1(x1)})`)
let y = 0
while (y < flags.length) {
  if (!flags[y]) { y++; continue }
  let e = y
  while (e + 1 < flags.length && flags[e + 1]) e++
  const m = rowMean((y + e) >> 1)
  console.log(`  dev ${String(y).padStart(4)}..${String(e).padEnd(4)}  css ${c1(y)}..${c1(e + 1)}  h=${(e - y + 1)}dev/${c1(e - y + 1)}css  mean ${hex(m)}`)
  y = e + 1
}
