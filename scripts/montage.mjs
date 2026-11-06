/**
 * Tiles qa/out/*.png into a few labelled sheets so the whole render matrix can
 * be reviewed in a couple of looks instead of one read per state.
 *   node scripts/montage.mjs [perPage]
 */
import sharp from 'sharp'
import { readdirSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'qa/out')
const SHEETS = path.join(ROOT, 'qa/montage')
mkdirSync(SHEETS, { recursive: true })

const perPage = Number(process.argv[2] ?? 8)
const CELL_W = 300
const LABEL_H = 26
const GAP = 10

const files = readdirSync(OUT)
  .filter((f) => f.endsWith('.png') && !f.startsWith('_'))
  .sort()

console.log(`${files.length} renders, ${perPage} per sheet`)

for (let p = 0; p * perPage < files.length; p++) {
  const slice = files.slice(p * perPage, (p + 1) * perPage)
  const cols = 4
  const rows = Math.ceil(slice.length / cols)
  const parts = [
    `<svg width="${cols * (CELL_W + GAP) + GAP}" height="${rows * (CELL_W * 2.2 + LABEL_H + GAP) + GAP}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="100%" height="100%" fill="#0f1116"/>`,
  ]

  for (let i = 0; i < slice.length; i++) {
    const buf = await sharp(path.join(OUT, slice[i]))
      .resize({ width: CELL_W, height: CELL_W * 2.2, fit: 'inside', background: '#1b1e26' })
      .flatten({ background: '#1b1e26' })
      .png()
      .toBuffer()
    const x = GAP + (i % cols) * (CELL_W + GAP)
    const y = GAP + Math.floor(i / cols) * (CELL_W * 2.2 + LABEL_H + GAP)
    parts.push(
      `<image x="${x}" y="${y}" width="${CELL_W}" height="${CELL_W * 2.2}" href="data:image/png;base64,${buf.toString('base64')}"/>`,
      `<text x="${x}" y="${y + CELL_W * 2.2 + 17}" fill="#c9cede" font-family="monospace" font-size="13">${slice[i].replace(/\.png$/, '').replace(/[&<>]/g, '')}</text>`,
    )
  }
  parts.push('</svg>')

  const target = path.join(SHEETS, `sheet-${String(p + 1).padStart(2, '0')}.png`)
  await sharp(Buffer.from(parts.join(''))).png().toFile(target)
  console.log(target)
}
