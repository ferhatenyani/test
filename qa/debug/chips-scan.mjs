/**
 * chips-scan.mjs — per-chip geometry for the two chip rows in the service set:
 * the academic-transcripts year row (18.26.06 (4)) and the timetable day row
 * (18.26.05 (2)). Height, border, radius, gap, and whether the row is clipped by
 * the viewport (i.e. scrolls). Scratch tooling for `service`.
 *
 *   node qa/debug/chips-scan.mjs
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

async function raw(n) {
  const { data, info } = await sharp(path.join(SHOTS, `WhatsApp Image 2026-10-25 at ${n}.jpeg`)).rotate()
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = info.channels
  return { W, H, at: (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]] } }
}

/** runs of `pred` in a row, keeping everything >=2 device px wide */
function runs(img, y, x0, x1, pred, min = 2) {
  const out = []
  let s = -1
  for (let x = x0; x <= x1; x++) {
    if (pred(img.at(x, y))) { if (s < 0) s = x }
    else if (s >= 0) { if (x - s >= min) out.push([s, x - 1]); s = -1 }
  }
  if (s >= 0 && x1 - s >= min) out.push([s, x1])
  return out
}
function vruns(img, x, y0, y1, pred, min = 2) {
  const out = []
  let s = -1
  for (let y = y0; y <= y1; y++) {
    if (pred(img.at(x, y))) { if (s < 0) s = y }
    else if (s >= 0) { if (y - s >= min) out.push([s, y - 1]); s = -1 }
  }
  if (s >= 0 && y1 - s >= min) out.push([s, y1])
  return out
}

function report(name, cy0, cy1, pred, label) {
  return async () => {
    const img = await raw(name)
    const y0 = Math.round(cy0 * S), y1 = Math.round(cy1 * S)
    console.log(`\n### ${label}  (${name})  window CSS y ${cy0}..${cy1}`)
    // topmost row that still shows chip outlines, and the vertical middle
    const mid = Math.round((y0 + y1) / 2)
    for (const [tag, yy] of [['top edge row', y0 + 2], ['upper', y0 + 8], ['mid', mid], ['lower', y1 - 8]]) {
      const r = runs(img, yy, 0, img.W - 1, pred)
      console.log(`  ${tag.padEnd(12)} y=${css(yy)}: ${r.length} runs  ${r.map(([a, b]) => `${css(a)}..${css(b)}(w${css(b - a + 1)})`).join('  ')}`)
    }
    // vertical extent of the leftmost chip border column
    const first = runs(img, mid, 0, img.W - 1, pred)[0]
    if (first) {
      const v = vruns(img, first[0] + 1, y0, y1, pred)
      console.log(`  leftmost chip x ${css(first[0])}..${css(first[1])} (w ${css(first[1] - first[0] + 1)})`)
      console.log(`  border-column vertical runs at x=${css(first[0] + 1)}: ${v.map(([a, b]) => `${css(a)}..${css(b)}(h${css(b - a + 1)})`).join('  ')}`)
      // border thickness: horizontal run at the chip's vertical middle of the LEFT arc
      const t = runs(img, mid, first[0], first[0] + 6, pred, 1)
      console.log(`  left-arc thickness ${t.map(([a, b]) => css(b - a + 1)).join(',')} CSS`)
      // radius probe: how far in does the top border start vs the chip's left x
      const topR = runs(img, y0 + 2, 0, img.W - 1, pred)[0]
      if (topR) console.log(`  top-border run starts ${css(topR[0] - first[0])} CSS right of chip left -> radius ~${css(topR[0] - first[0])}`)
    }
    const all = runs(img, mid, 0, img.W - 1, pred)
    for (let i = 0; i + 1 < all.length; i++) console.log(`  gap ${i}->${i + 1}: ${css(all[i + 1][0] - all[i][1] - 1)} CSS`)
    console.log(`  row right edge: last run ends ${all.length ? css(all.at(-1)[1]) : 'n/a'} of 360 -> clipped ${all.length ? all.at(-1)[1] >= img.W - 4 : false}`)
    return img
  }
}

const outlined = (c) => d(c, GREEN) < 90 && d(c, BG) > 25
await report('18.26.06 (4)', 98, 142, (c) => d(c, GREEN) < 90, 'YEAR CHIPS (green outline)')()
await report('18.26.05 (2)', 154, 202, outlined, 'DAY CHIPS (grey outline + one filled)')()
