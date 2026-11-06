/**
 * Edge/colour probe for reference captures — transcribes CSS px numbers
 * directly from device pixels (device / 1.5 = CSS) so nothing depends on
 * reading a printed grid off an overlay.
 *
 *   node scripts/qa/pxprobe.mjs <capture> row <cssY> [cssX0] [cssX1]
 *   node scripts/qa/pxprobe.mjs <capture> col <cssX> [cssY0] [cssY1]
 *   node scripts/qa/pxprobe.mjs <capture> at <cssX> <cssY>
 *   node scripts/qa/pxprobe.mjs <capture> box <cssX> <cssY> <cssW> <cssH>
 *   node scripts/qa/pxprobe.mjs <capture> bbox <x0> <y0> <x1> <y1>
 *
 * row/col print every colour transition along that scanline with its CSS
 * coordinate; `min` sets the delta that counts as an edge (default 24).
 *
 * `bbox` reports the tight box of every pixel in the region that differs from
 * BG (default #101115) by more than MIN. The same call works on a reference
 * capture and on a qa/out render, which is what makes glyph sizes and text
 * baselines comparable between the two.
 */
import sharp from 'sharp'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { SHOTS, OUT } from './lib.mjs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/qa/pxprobe.mjs <capture> row|col|at|box ...')
  process.exit(1)
}
const mode = process.argv[3]
const args = process.argv.slice(4).map(Number)
const MIN = Number(process.env.MIN ?? 24)

const src = existsSync(path.join(SHOTS, file))
  ? path.join(SHOTS, file)
  : path.join(OUT, file.endsWith('.png') ? file : `${file}.png`)
if (!existsSync(src)) {
  console.error(`no such capture in screenshots/ nor render in qa/out/: ${file}`)
  process.exit(1)
}
const img = await sharp(src).rotate()
const meta = await img.clone().metadata()
const S = meta.width === 540 ? 1.5 : 591 / 394 // device px per CSS px
const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const CH = info.channels
const cssW = Math.round(meta.width / S)
const cssH = Math.round(meta.height / S)

const at = (cx, cy) => {
  const x = Math.round(cx * S)
  const y = Math.round(cy * S)
  if (x < 0 || y < 0 || x >= info.width || y >= info.height) return null
  const i = (y * info.width + x) * CH
  return { r: data[i], g: data[i + 1], b: data[i + 2] }
}
const hexOf = (c) => (c ? `#${[c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('')}` : '—')
const d = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))

console.log(`${file}  ${meta.width}x${meta.height} device = ${cssW}x${cssH} CSS (÷${S})`)

if (mode === 'at') {
  console.log(`at (${args[0]}, ${args[1]}) CSS -> ${hexOf(at(args[0], args[1]))}`)
} else if (mode === 'box') {
  const [x0, y0, w, h] = args
  const hist = new Map()
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const c = at(x, y)
    if (!c) continue
    const k = hexOf(c)
    hist.set(k, (hist.get(k) || 0) + 1)
  }
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP ?? 8))
  console.log(`box ${x0},${y0} ${w}x${h} CSS — ${hist.size} colours, top:`)
  for (const [k, n] of top) console.log(`  ${k}  ${n} px  ${((n / (w * h)) * 100).toFixed(1)}%`)
} else if (mode === 'bbox') {
  const [x0, y0, x1, y1] = args
  const bg = { r: 0, g: 0, b: 0 }
  const bh = (process.env.BG ?? '101115').replace('#', '')
  bg.r = parseInt(bh.slice(0, 2), 16); bg.g = parseInt(bh.slice(2, 4), 16); bg.b = parseInt(bh.slice(4, 6), 16)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, n = 0
  for (let y = y0; y <= y1; y += 0.5) for (let x = x0; x <= x1; x += 0.5) {
    const c = at(x, y)
    if (!c) continue
    if (d(c, bg) > MIN) {
      n++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (!n) console.log(`bbox ${x0},${y0}..${x1},${y1}: nothing differs from #${bh} by >${MIN}`)
  else
    console.log(
      `bbox ${x0},${y0}..${x1},${y1} vs #${bh} Δ>${MIN}: x ${minX.toFixed(1)}..${maxX.toFixed(1)} (w ${(maxX - minX).toFixed(1)})  y ${minY.toFixed(1)}..${maxY.toFixed(1)} (h ${(maxY - minY).toFixed(1)})  cx ${((minX + maxX) / 2).toFixed(1)} cy ${((minY + maxY) / 2).toFixed(1)}  ${n} px`
    )
} else if (mode === 'row' || mode === 'col') {
  const fixed = args[0]
  const lo = args[1] ?? 0
  const hi = args[2] ?? (mode === 'row' ? cssW : cssH)
  console.log(`${mode} ${mode === 'row' ? 'y' : 'x'}=${fixed} CSS, scanning ${lo}..${hi} (edge Δ>${MIN})`)
  let prev = null
  let prevAt = null
  for (let v = lo; v <= hi; v += 0.5) {
    const c = mode === 'row' ? at(v, fixed) : at(fixed, v)
    if (!c) continue
    if (prev === null || d(c, prev) > MIN) {
      if (prev !== null) console.log(`  ${v.toFixed(1).padStart(7)}  ${hexOf(c)}   (was ${hexOf(prev)} from ${prevAt.toFixed(1)})`)
      else console.log(`  ${v.toFixed(1).padStart(7)}  ${hexOf(c)}   start`)
      prev = c
      prevAt = v
    }
  }
} else {
  console.error('mode must be row|col|at|box')
  process.exit(1)
}
