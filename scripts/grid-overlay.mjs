/**
 * Draws a labelled 5%/10% grid over a reference capture so crop rects can be
 * measured instead of guessed. Output: qa/debug/<name>-grid.png
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'qa/debug')
mkdirSync(OUT, { recursive: true })

const TARGETS = [
  ['home', 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/WhatsApp Image 2026-10-25 at 18.26.15.jpeg'],
  ['home1', 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/WhatsApp Image 2026-10-25 at 18.26.14 (1).jpeg'],
]

function gridSvg(w, h) {
  const parts = [`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`]
  for (let i = 1; i < 20; i++) {
    const x = ((i * 5) / 100) * w
    const y = ((i * 5) / 100) * h
    const major = i % 2 === 0
    const col = major ? '#ff2d55' : '#ff9500'
    const sw = major ? 2 : 1
    parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${col}" stroke-width="${sw}" opacity="0.75"/>`)
    parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${col}" stroke-width="${sw}" opacity="0.75"/>`)
    if (major) {
      const lx = i * 5
      const ly = i * 5
      parts.push(
        `<text x="${x + 3}" y="16" fill="${col}" font-family="monospace" font-size="15" font-weight="bold">x${lx}</text>`,
      )
      parts.push(
        `<text x="3" y="${y - 3}" fill="${col}" font-family="monospace" font-size="15" font-weight="bold">y${ly}</text>`,
      )
    }
  }
  parts.push('</svg>')
  return parts.join('')
}

for (const [name, file] of TARGETS) {
  const src = sharp(file, { failOn: 'none' })
  const { width, height } = await src.metadata()
  await src
    .composite([{ input: Buffer.from(gridSvg(width, height)), tile: true }])
    .png()
    .toFile(path.join(OUT, `${name}-grid.png`))
  console.log(`${name}-grid.png  ${width}x${height}`)
}
