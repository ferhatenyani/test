/**
 * detail-scan.mjs — the remaining service transcriptions: the two chip rows, the
 * calendar-with-x glyph, and the caption text colours (mode, not min, so JPEG
 * antialiasing cannot darken the answer). Scratch tooling for `service`.
 *
 *   node qa/debug/detail-scan.mjs
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SHOTS = path.join(ROOT, 'screenshots')
const S = 1.5
const BG = [245, 246, 248]
const GREEN = [0, 149, 119]
const css = (v) => Math.round((v / S) * 100) / 100
const d = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const hex = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')

async function raw(file) {
  const { data, info } = await sharp(path.join(SHOTS, file)).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = info.channels
  return { W, H, at: (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]] } }
}
const cap = (n) => `WhatsApp Image 2026-10-25 at ${n}.jpeg`

function box(img, x0, y0, x1, y1, pred) {
  let lx = 1e9, rx = -1, ty = 1e9, by = -1, n = 0
  for (let y = Math.max(0, y0); y <= Math.min(img.H - 1, y1); y++)
    for (let x = Math.max(0, x0); x <= Math.min(img.W - 1, x1); x++)
      if (pred(img.at(x, y))) { n++; if (x < lx) lx = x; if (x > rx) rx = x; if (y < ty) ty = y; if (y > by) by = y }
  return rx < 0 ? null : { lx, rx, ty, by, n, x: css(lx), x1: css(rx), w: css(rx - lx + 1), y0: css(ty), y1: css(by), h: css(by - ty + 1) }
}

const modeColour = (img, b, pred) => {
  const tally = new Map()
  for (let y = b.ty; y <= b.by; y++) for (let x = b.lx; x <= b.rx; x++) {
    const c = img.at(x, y)
    if (!pred(c)) continue
    const k = c.map((v) => Math.round(v / 6) * 6).join(',')
    tally.set(k, (tally.get(k) || 0) + 1)
  }
  return [...tally.entries()].sort((a, z) => z[1] - a[1]).slice(0, 4)
    .map(([k, n]) => `${hex(k.split(',').map(Number))} x${n}`).join('  ')
}

function runsInRow(img, y, x0, x1, pred) {
  const out = []
  let s = -1
  for (let x = x0; x <= x1; x++) {
    if (pred(img.at(x, y))) { if (s < 0) s = x }
    else if (s >= 0) { out.push([s, x - 1]); s = -1 }
  }
  if (s >= 0) out.push([s, x1])
  return out.filter(([a, b]) => b - a > 4)
}

// ---------- 1. year chips ----------
{
  const img = await raw(cap('18.26.06 (4)'))
  const y0 = Math.round(95 * S), y1 = Math.round(145 * S)
  const greenish = (c) => d(c, GREEN) < 70
  const b = box(img, 0, y0, img.W - 1, y1, greenish)
  console.log('\n### YEAR CHIPS  18.26.06 (4)')
  if (!b) console.log('  none')
  else {
    console.log(`  chip row ink  x ${b.x}..${b.x1} (w ${b.w})  y ${b.y0}..${b.y1} (h ${b.h})`)
    const mid = Math.round((b.ty + b.by) / 2)
    const runs = runsInRow(img, mid, 0, img.W - 1, greenish)
    for (let i = 0; i < runs.length; i++) {
      const gap = i + 1 < runs.length ? css(runs[i + 1][0] - runs[i][1] - 1) : 'to-edge ' + css(img.W - 1 - runs[i][1])
      console.log(`    run ${i}: x ${css(runs[i][0])}..${css(runs[i][1])} w ${css(runs[i][1] - runs[i][0] + 1)}  gap-after ${gap}`)
    }
    const vb = box(img, runs[0][0], y0, runs[0][0] + 3, y1, greenish)
    console.log(`  chip0 left border vertical y ${vb.y0}..${vb.y1} (h ${vb.h})`)
    const stem = runsInRow(img, mid, runs[0][0], runs[0][0] + 10, greenish)
    console.log(`  border thickness ${stem.map(([a, z]) => css(z - a + 1)).join(',')} CSS`)
    console.log(`  row reaches right edge: ${b.x1 > 355}`)
  }
}

// ---------- 2. day chips + tall band ----------
{
  const img = await raw(cap('18.26.05 (2)'))
  console.log('\n### DAY CHIPS  18.26.05 (2)')
  const y0 = Math.round(150 * S), y1 = Math.round(205 * S)
  const notBg = (c) => d(c, BG) > 20
  const b = box(img, 0, y0, img.W - 1, y1, notBg)
  if (!b) console.log('  none')
  else {
    console.log(`  chip row ink  x ${b.x}..${b.x1} (w ${b.w})  y ${b.y0}..${b.y1} (h ${b.h})`)
    const mid = Math.round((b.ty + b.by) / 2)
    const runs = runsInRow(img, mid, 0, img.W - 1, notBg)
    for (let i = 0; i < runs.length; i++) {
      const filled = d(img.at(Math.round((runs[i][0] + runs[i][1]) / 2), mid), GREEN) < 60
      const gap = i + 1 < runs.length ? css(runs[i + 1][0] - runs[i][1] - 1) : 'to-edge ' + css(img.W - 1 - runs[i][1])
      console.log(`    chip ${i}: x ${css(runs[i][0])}..${css(runs[i][1])} w ${css(runs[i][1] - runs[i][0] + 1)} ${filled ? 'FILLED' : 'outlined'}  gap-after ${gap}`)
    }
    const vb = box(img, runs[0][0], y0, runs[0][0] + 4, y1, notBg)
    console.log(`  chip0 vertical y ${vb.y0}..${vb.y1} (h ${vb.h})`)
  }
}

// ---------- 3. cal-x glyph ----------
{
  const img = await raw(cap('18.26.06 (2)'))
  console.log('\n### CAL-X GLYPH  18.26.06 (2)')
  const y0 = Math.round(200 * S), y1 = Math.round(280 * S)
  const glyph = box(img, 0, y0, img.W - 1, y1, (c) => d(c, BG) > 55)
  const disc = box(img, 0, y0, img.W - 1, y1, (c) => d(c, BG) > 6)
  console.log(`  glyph ink    x ${glyph.x}..${glyph.x1} (w ${glyph.w})  y ${glyph.y0}..${glyph.y1} (h ${glyph.h})  cx ${css((glyph.lx + glyph.rx) / 2)}`)
  console.log(`  + circle     x ${disc.x}..${disc.x1} (w ${disc.w})  y ${disc.y0}..${disc.y1} (h ${disc.h})  cx ${css((disc.lx + disc.rx) / 2)}`)
  console.log(`  circle fill  ${hex(img.at(Math.round((disc.lx + disc.rx) / 2), disc.ty + 5))}`)
  let m = null
  for (let y = glyph.ty; y <= glyph.by; y++) for (let x = glyph.lx; x <= glyph.rx; x++) { const c = img.at(x, y); if (!m || c[0] + c[1] + c[2] < m[0] + m[1] + m[2]) m = c }
  console.log(`  glyph darkest ${hex(m)}  mode ${modeColour(img, glyph, (c) => d(c, BG) > 60)}`)
}

// ---------- 4. captions ----------
for (const [name, cy0, cy1] of [['18.26.06', 432, 462], ['18.26.06 (1)', 458, 484], ['18.26.05 (1)', 438, 500], ['18.26.05', 438, 472]]) {
  const img = await raw(cap(name))
  const b = box(img, 0, Math.round(cy0 * S), img.W - 1, Math.round(cy1 * S), (c) => d(c, BG) > 40)
  console.log(`\n### CAPTION ${name}`)
  if (!b) { console.log('  none'); continue }
  console.log(`  ink  x ${b.x}..${b.x1} (w ${b.w})  y ${b.y0}..${b.y1} (h ${b.h})  n=${b.n}`)
  console.log(`  fill ${modeColour(img, b, (c) => d(c, BG) > 90)}`)
}
