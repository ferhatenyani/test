/**
 * Scratch: text metrics. For a CSS rect, count "ink" pixels per row and per
 * column and report the ink band. Region given in CSS px.
 *   node .qwen/tmp/text.mjs <x0> <y0> <x1> <y1> [darkBelow]
 */
import sharp from 'sharp'
const SRC = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/WhatsApp Image 2026-10-25 at 18.35.12.jpeg'
const [x0, y0, x1, y1, thr] = process.argv.slice(2).map(Number)
const T = thr || 175
const { data, info } = await sharp(SRC).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, CH = info.channels
const lum = (x, y) => { const i = (y * W + x) * CH; return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] }
const S = 1.5
const toDev = (v) => Math.round(v * S)
const DX0 = toDev(x0), DX1 = Math.min(toDev(x1), W - 1)
const DY0 = toDev(y0), DY1 = Math.min(toDev(y1), info.height - 1)
const rows = []
for (let y = DY0; y <= DY1; y++) {
  let n = 0
  for (let x = DX0; x <= DX1; x++) if (lum(x, y) < T) n++
  rows.push([y, n])
}
const inkRows = rows.filter((r) => r[1] > 0)
const cols = []
for (let x = DX0; x <= DX1; x++) {
  let n = 0
  for (let y = DY0; y <= DY1; y++) if (lum(x, y) < T) n++
  cols.push([x, n])
}
const inkCols = cols.filter((c) => c[1] > 0)
const f = (n) => (n / S).toFixed(1)
console.log(`rect css(${x0},${y0})-(${x1},${y1})  dark<${T}`)
if (!inkRows.length || !inkCols.length) { console.log('  no ink'); process.exit(0) }
console.log(`  ink rows  dev ${inkRows[0][0]}..${inkRows.at(-1)[0]}  css ${f(inkRows[0][0])}..${f(inkRows.at(-1)[0] + 1)}  height ${f(inkRows.at(-1)[0] - inkRows[0][0] + 1)} css`)
console.log(`  ink cols  dev ${inkCols[0][0]}..${inkCols.at(-1)[0]}  css ${f(inkCols[0][0])}..${f(inkCols.at(-1)[0] + 1)}  width ${f(inkCols.at(-1)[0] - inkCols[0][0] + 1)} css`)
// contiguous row groups (per-line) so multi-line text can be split
const groups = []
let g = [inkRows[0]]
for (let i = 1; i < inkRows.length; i++) {
  if (inkRows[i][0] - inkRows[i - 1][0] > 2) { groups.push(g); g = [] }
  g.push(inkRows[i])
}
groups.push(g)
if (groups.length > 1)
  groups.forEach((gg, i) =>
    console.log(`    line${i + 1}: dev ${gg[0][0]}..${gg.at(-1)[0]}  css ${f(gg[0][0])}..${f(gg.at(-1)[0] + 1)}  h=${f(gg.at(-1)[0] - gg[0][0] + 1)}`)
  )
