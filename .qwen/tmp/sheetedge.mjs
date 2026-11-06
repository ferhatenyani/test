/**
 * Scratch: find, for each device row, the left/right x where the colour changes
 * from the page background (#f5f6f8) to something else — reveals the bottom
 * sheet's rounded top corners.
 *   node .qwen/tmp/sheetedge.mjs <file> <y0> <y1>
 */
import sharp from 'sharp'
import path from 'node:path'
const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const [file, y0, y1] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])]
const img = await sharp(path.join(SHOTS, file)).rotate().ensureAlpha()
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const W = info.width, CH = info.channels
const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
const hexs = (c) => '#' + c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
const bg = [0xf5, 0xf6, 0xf8]
const dd = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
for (let y = y0; y <= y1; y++) {
  let L = -1, R = -1
  for (let x = 0; x < W; x++) { if (dd(at(x, y), bg) > 18) { L = x; break } }
  for (let x = W - 1; x >= 0; x--) { if (dd(at(x, y), bg) > 18) { R = x; break } }
  console.log(`y=${String(y).padStart(4)} cssY=${(y / 1.5).toFixed(1)}  L dev=${String(L).padStart(3)} css=${(L / 1.5).toFixed(1)}  R dev=${String(R).padStart(3)} css=${(R / 1.5).toFixed(1)}  w dev=${R - L + 1} css=${((R - L + 1) / 1.5).toFixed(1)}  ${L >= 0 ? hexs(at(L, y)) : ''}/${R >= 0 ? hexs(at(R, y)) : ''}`)
}
