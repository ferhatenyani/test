/**
 * Scratch ruler with the CORRECT css-per-pixel math (ruler.mjs divides by
 * scale instead of multiplying, so its labels read 2.25x too large).
 *   node .qwen/tmp/grid.mjs <file> <cssX> <cssY> <cssW> <cssH> [step]
 * Region given in CSS px; output PNG is 4x zoom of that region with CSS grid.
 */
import sharp from 'sharp'
import path from 'node:path'
const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const OUT = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/grid'
const { mkdirSync } = await import('node:fs')
mkdirSync(OUT, { recursive: true })

const file = process.argv[2]
const [cx, cy, cw, ch] = process.argv.slice(3, 7).map(Number)
const step = Number(process.argv[7] || 10)
const img = await sharp(path.join(SHOTS, file)).rotate()
const meta = await img.clone().metadata()
const scale = meta.width === 540 ? 1.5 : 591 / 394
const ZOOM = 4
const region = {
  left: Math.round(cx * scale), top: Math.round(cy * scale),
  width: Math.min(Math.round(cw * scale), meta.width - Math.round(cx * scale)),
  height: Math.min(Math.round(ch * scale), meta.height - Math.round(cy * scale)),
}
const buf = await img.extract(region).resize({ width: region.width * ZOOM, height: region.height * ZOOM }).png().toBuffer()
const bm = await sharp(buf).metadata()
const W = bm.width, H = bm.height
const cssPerPx = 1 / (scale * ZOOM)   // <-- the corrected line
const lines = []
for (let c = Math.floor(cx / step) * step; c <= cx + W * cssPerPx; c += step) {
  const x = ((c - cx) / cssPerPx).toFixed(2)
  const major = c % (step * 5) === 0
  lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${major ? '#ff2d55' : '#00e5ff'}" stroke-opacity="${major ? 0.9 : 0.45}" stroke-width="${major ? 2 : 1}"/>`)
  if (major) lines.push(`<text x="${+x + 3}" y="18" fill="#ff2d55" font-family="monospace" font-size="17" font-weight="bold">${c}</text>`)
}
for (let c = Math.floor(cy / step) * step; c <= cy + H * cssPerPx; c += step) {
  const y = ((c - cy) / cssPerPx).toFixed(2)
  const major = c % (step * 5) === 0
  lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${major ? '#ff2d55' : '#00e5ff'}" stroke-opacity="${major ? 0.9 : 0.45}" stroke-width="${major ? 2 : 1}"/>`)
  if (major) lines.push(`<text x="3" y="${+y + 19}" fill="#ff2d55" font-family="monospace" font-size="17" font-weight="bold">${c}</text>`)
}
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><image width="${W}" height="${H}" href="data:image/png;base64,${buf.toString('base64')}"/>${lines.join('')}</svg>`
const dest = path.join(OUT, `${file.replace(/[^0-9.]+/g, '').replace(/^\.|\.$/g, '')}_${cx}_${cy}_${cw}x${ch}.png`)
await sharp(Buffer.from(svg)).png().toFile(dest)
console.log(`wrote ${dest}  region css(${cx},${cy}) ${cw}x${ch}  grid ${step} css px, major every ${step * 5}`)
