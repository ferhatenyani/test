/**
 * Turns a reference capture into something that can be read as numbers.
 *
 * Overlays a CSS-pixel grid (10 CSS px minor, 50 CSS px labelled major, already
 * divided by the capture's 1.5x factor) on a region, so spec values are
 * transcribed from the reference rather than copied off the current render.
 *
 *   node scripts/qa/ruler.mjs "WhatsApp Image 2026-10-25 at 18.56.55 (1).jpeg"
 *   node scripts/qa/ruler.mjs <capture> <cssX> <cssY> <cssW> <cssH>   # device px crop
 */
import sharp from 'sharp'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { SHOTS, QA, PROFILES } from './lib.mjs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/qa/ruler.mjs <capture.jpeg> [devX devY devW devH]')
  process.exit(1)
}
const src = path.join(SHOTS, file)
const crop = process.argv.slice(3, 7).map(Number)
const useCrop = crop.length === 4 && crop.every((n) => Number.isFinite(n))

const DIR = path.join(QA, 'ruler')
mkdirSync(DIR, { recursive: true })

const img = await sharp(src).rotate()
const meta = await img.clone().metadata()
const scale = meta.width === 540 ? 1.5 : 591 / 394
const ZOOM = 2

let region = { left: 0, top: 0, width: meta.width, height: meta.height }
if (useCrop) {
  region = {
    left: Math.max(0, Math.round(crop[0] * scale)),
    top: Math.max(0, Math.round(crop[1] * scale)),
    width: Math.min(meta.width - Math.round(crop[0] * scale), Math.round(crop[2] * scale)),
    height: Math.min(meta.height - Math.round(crop[1] * scale), Math.round(crop[3] * scale)),
  }
}

const buf = await img.extract(region).resize({ width: region.width * ZOOM, height: region.height * ZOOM }).png().toBuffer()
const bm = await sharp(buf).metadata()

const cssPerPx = scale / ZOOM
const W = bm.width
const H = bm.height
const originCssX = region.left / scale
const originCssY = region.top / scale

const lines = []
const startCssX = Math.floor(originCssX / 10) * 10
for (let c = startCssX; c <= originCssX + W * cssPerPx; c += 10) {
  const x = ((c - originCssX) / cssPerPx).toFixed(2)
  const major = c % 50 === 0
  lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${major ? '#ff2d55' : '#00e5ff'}" stroke-opacity="${major ? 0.85 : 0.4}" stroke-width="${major ? 2 : 1}"/>`)
  if (major) lines.push(`<text x="${+x + 3}" y="16" fill="#ff2d55" font-family="monospace" font-size="15" font-weight="bold">${c}</text>`)
}
const startCssY = Math.floor(originCssY / 10) * 10
for (let c = startCssY; c <= originCssY + H * cssPerPx; c += 10) {
  const y = ((c - originCssY) / cssPerPx).toFixed(2)
  const major = c % 50 === 0
  lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${major ? '#ff2d55' : '#00e5ff'}" stroke-opacity="${major ? 0.85 : 0.4}" stroke-width="${major ? 2 : 1}"/>`)
  if (major) lines.push(`<text x="3" y="${+y + 17}" fill="#ff2d55" font-family="monospace" font-size="15" font-weight="bold">${c}</text>`)
}

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><image width="${W}" height="${H}" href="data:image/png;base64,${buf.toString('base64')}"/>${lines.join('')}</svg>`

const name = `${file.replace(/[^0-9.]+/g, '').replace(/^\.|\.$/g, '')}${useCrop ? `_${crop.join('x')}` : ''}.png`
const dest = path.join(DIR, name)
await sharp(Buffer.from(svg)).png().toFile(dest)

console.log(`wrote ${dest}`)
console.log(`source ${meta.width}x${meta.height} device px = ${Math.round(meta.width / scale)}x${Math.round(meta.height / scale)} CSS pt (scale ${scale})`)
console.log(`grid: minor 10 CSS px, major+label 50 CSS px, origin ${useCrop ? `(${crop[0]},${crop[1]}) device px` : 'at top-left'}`)
