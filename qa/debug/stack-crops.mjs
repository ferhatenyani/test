/**
 * stack-crops.mjs — paste equal-scale device-px crops from several captures into
 * one image, so "same size or not?" is answered by looking, not by arguing about
 * thresholds. Labels are burned in.
 *
 *   node qa/debug/stack-crops.mjs <out.png> <x> <y> <w> <h> "<cap1>" "<cap2>" ...
 * x/y/w/h are DEVICE px (so every crop is at 1:1 native scale).
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SHOTS = path.join(ROOT, 'screenshots')

const [out, x, y, w, h, ...caps] = process.argv.slice(2)
if (!out || !caps.length) {
  console.error('usage: node qa/debug/stack-crops.mjs <out.png> <x> <y> <w> <h> "<capture>" ...')
  process.exit(1)
}
const [X, Y, W, H] = [x, y, w, h].map(Number)
const GAP = 26
const ZOOM = 2

const tiles = []
for (const spec of caps) {
  const at = spec.lastIndexOf(':')
  const cap = at > 0 ? spec.slice(0, at) : spec
  const yOwn = at > 0 ? Number(spec.slice(at + 1)) : Y
  const buf = await sharp(path.join(SHOTS, cap)).rotate()
    .extract({ left: X, top: yOwn, width: W, height: H })
    .resize({ width: W * ZOOM, height: H * ZOOM })
    .png().toBuffer()
  tiles.push({ buf, label: `${cap.replace(/^WhatsApp Image 2026-10-25 at /, '').replace('.jpeg', '')}  dev ${X},${yOwn} ${W}x${H} = CSS ${(X / 1.5).toFixed(1)},${(yOwn / 1.5).toFixed(1)}` })
}

const CW = W * ZOOM
const CH = H * ZOOM
const TH = CW * tiles.length + GAP * (tiles.length - 1)
const svg = `<svg width="${CW}" height="${TH + 18}" xmlns="http://www.w3.org/2000/svg">
<rect width="100%" height="100%" fill="#111418"/>
${tiles.map((t, i) => {
  const top = i * (CH + GAP)
  return `<text x="2" y="${top + 13}" fill="#ffd479" font-family="monospace" font-size="13">${t.label}  dev ${X},${Y} ${W}x${H}  = CSS ${(X / 1.5).toFixed(1)},${(Y / 1.5).toFixed(1)}</text>
<image x="0" y="${top + 16}" width="${CW}" height="${CH}" href="data:image/png;base64,${t.buf.toString('base64')}"/>`
}).join('')}
</svg>`
await sharp(Buffer.from(svg)).png().toFile(path.join(ROOT, out))
console.log(`wrote ${out}  ${tiles.length} tiles, each ${W}x${H} device px at ${ZOOM}x`)
