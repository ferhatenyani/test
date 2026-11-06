/**
 * Scratch: print sampled colours along a row/column so soft edges (shadows,
 * card borders) are visible instead of being thresholded away.
 *   node .qwen/tmp/prof.mjs row <y> <x0> <x1> <step>
 *   node .qwen/tmp/prof.mjs col <x> <y0> <y1> <step>
 */
import sharp from 'sharp'
const SRC = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/WhatsApp Image 2026-10-25 at 18.35.12.jpeg'
const [mode, fixed, a, b, step] = process.argv.slice(2).map(Number)
const { data, info } = await sharp(SRC).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, CH = info.channels
const at = (x, y) => { const i = (y * W + x) * CH; return '#' + [data[i], data[i + 1], data[i + 2]].map((n) => n.toString(16).padStart(2, '0')).join('') }
const out = []
for (let i = a; i <= b; i += step) out.push(`${i}(${(i / 1.5).toFixed(0)}):${mode === 'row' ? at(i, fixed) : at(fixed, i)}`)
console.log(`${mode} ${fixed}: ` + out.join('  '))
