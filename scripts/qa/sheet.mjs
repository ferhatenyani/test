/**
 * Contact sheet of every reference capture with its timestamp burned in, so a
 * render can be paired to the right screenshot by eye before any measurement.
 *   node scripts/qa/sheet.mjs            # all captures
 *   node scripts/qa/sheet.mjs 18.25 18.56  # only names containing these
 */
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'
import { SHOTS, QA } from './lib.mjs'

const filters = process.argv.slice(2)
const CELL_W = 168
const CELL_H = 372
const LAB = 22
const PAD = 6
const COLS = 7

const files = fs
  .readdirSync(SHOTS)
  .filter((f) => f.endsWith('.jpeg'))
  .filter((f) => !filters.length || filters.some((q) => f.includes(q)))

const tiles = []
for (const f of files) {
  const short = f.replace('WhatsApp Image 2026-10-25 at ', '').replace('.jpeg', '')
  const buf = await sharp(path.join(SHOTS, f))
    .rotate()
    .resize({ width: CELL_W, height: CELL_H, fit: 'inside' })
    .png()
    .toBuffer()
  const label = Buffer.from(
    `<svg width="${CELL_W}" height="${LAB}"><rect width="100%" height="100%" fill="#000"/><text x="3" y="15" fill="#7ee0c0" font-family="monospace" font-size="12">${short}</text></svg>`,
  )
  const cell = await sharp({ create: { width: CELL_W, height: CELL_H + LAB, channels: 3, background: '#141414' } })
    .composite([
      { input: await sharp(label).png().toBuffer(), top: 0, left: 0 },
      { input: buf, top: LAB, left: 0 },
    ])
    .png()
    .toBuffer()
  tiles.push(cell)
}

const rows = Math.ceil(tiles.length / COLS)
const W = COLS * (CELL_W + PAD)
const H = rows * (CELL_H + LAB + PAD)
const composites = tiles.map((input, i) => ({
  input,
  left: (i % COLS) * (CELL_W + PAD),
  top: Math.floor(i / COLS) * (CELL_H + LAB + PAD),
}))

const dest = path.join(QA, 'sheet.png')
await sharp({ create: { width: W, height: H, channels: 3, background: '#000000' } })
  .composite(composites)
  .png()
  .toFile(dest)
console.log(`wrote ${dest} ${W}x${H} (${tiles.length} captures, ${COLS} cols, row-major)`)
