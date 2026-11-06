/**
 * service-scan.mjs — transcribes geometry from every service capture in CSS px
 * (device px / 1.5). Scratch tooling owned by the `service` agent; not part of
 * the harness.
 *
 *   node qa/debug/service-scan.mjs ["capture substring"]
 *
 * Deliberately does NOT use scripts/qa/ruler.mjs: that tool lays its grid out
 * with cssPerPx = scale/ZOOM while the zoomed buffer holds scale*ZOOM px per CSS
 * px, so its printed labels are 2.25x off the image (a 360 CSS-wide capture is
 * labelled up to ~810). Raw pixels are unambiguous.
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SHOTS = path.join(ROOT, 'screenshots')
const SCALE = 1.5
const GREEN = [0, 149, 119]
const BG = [245, 246, 248]
/** white @20% over the brand band — the back-button disc */
const DISC = [52, 170, 146]

const ALL = [
  '18.26.05', '18.26.05 (1)', '18.26.05 (2)',
  '18.26.06', '18.26.06 (1)', '18.26.06 (2)', '18.26.06 (3)', '18.26.06 (4)',
].map((n) => `WhatsApp Image 2026-10-25 at ${n}.jpeg`)
const arg = process.argv[2]
const CAPTURES = arg ? ALL.filter((f) => f.includes(arg)) : ALL

const css = (v) => Math.round((v / SCALE) * 10) / 10
const d = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const hex = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')

async function load(file) {
  const { data, info } = await sharp(path.join(SHOTS, file)).rotate().ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, CH = info.channels
  return { W, H, at: (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] } }
}

function box(img, x0, y0, x1, y1, pred) {
  let lx = 1e9, rx = -1, ty = 1e9, by = -1, n = 0
  for (let y = Math.max(0, y0); y <= Math.min(img.H - 1, y1); y++)
    for (let x = Math.max(0, x0); x <= Math.min(img.W - 1, x1); x++)
      if (pred(img.at(x, y), x, y)) { n++; if (x < lx) lx = x; if (x > rx) rx = x; if (y < ty) ty = y; if (y > by) by = y }
  if (rx < 0) return null
  return {
    lx, rx, ty, by, n,
    x: css(lx), x1: css(rx), w: css(rx - lx + 1), cx: css((lx + rx) / 2),
    y: css(ty), y1: css(by), h: css(by - ty + 1), cy: css((ty + by) / 2),
  }
}

/** longest contiguous run of pred in a column, scanning y from y0 */
function longestRun(img, x, y0, y1, pred) {
  let best = null, s = -1
  for (let y = y0; y <= y1; y++) {
    if (pred(img.at(x, y))) { if (s < 0) s = y }
    else {
      if (s >= 0 && (!best || y - s > best.len)) best = { s, e: y - 1, len: y - s }
      s = -1
    }
  }
  if (s >= 0 && (!best || y1 + 1 - s > best.len)) best = { s, e: y1, len: y1 + 1 - s }
  return best
}

const show = (t, label) => {
  if (!t) return console.log(`  ${label.padEnd(12)} —`)
  console.log(`  ${label.padEnd(12)} x ${t.x}..${t.x1} (w ${t.w}, cx ${t.cx})  y ${t.y}..${t.y1} (h ${t.h}, cy ${t.cy})`)
}

for (const file of CAPTURES) {
  const img = await load(file)
  const name = file.replace('WhatsApp Image 2026-10-25 at ', '').replace('.jpeg', '')
  console.log(`\n=== ${name}  ${img.W}x${img.H} dev  ·  all values CSS px ===`)

  // --- brand band: longest contiguous green run down a text-free column
  const cols = [0.06, 0.5, 0.94].map((f) => Math.round(f * (img.W - 1)))
  const runs = cols.map((x) => longestRun(img, x, 20, img.H - 1, (c) => d(c, GREEN) <= 26)).filter(Boolean)
  const band = runs.sort((a, b) => b.len - a.len)[0]
  const bt = band.s, bb = band.e
  console.log(`  band         top ${css(bt)}  bottom ${css(bb)}  height ${css(bb - bt + 1)}   (dev ${bt}..${bb})`)

  // --- back disc: solid translucent-white-over-green blob. Text antialiasing
  //     passes through the same blend, so demand a full 3x3 neighbourhood.
  const solidDisc = (_c, x, y) => {
    if (x < 1 || y < 1 || x > img.W - 2 || y > img.H - 2) return false
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (d(img.at(x + dx, y + dy), DISC) > 34) return false
    return true
  }
  const disc = box(img, 0, bt, img.W - 1, bb, solidDisc)
  if (disc) {
    console.log(`  disc         x ${disc.x}..${disc.x1} (w ${disc.w})  y ${disc.y}..${disc.y1} (h ${disc.h})  cx ${disc.cx} cy ${disc.cy}`)
    console.log(`               inset left ${disc.x}  right ${css(img.W - 1 - disc.rx)}  top below band ${css(disc.ty - bt)}  cy inside band ${css((disc.ty + disc.by) / 2 - bt)}`)
  } else console.log('  disc         —')

  // --- header title: near-white text inside the band, excluding the disc box
  const inDisc = (x, y) => disc && x >= disc.lx - 2 && x <= disc.rx + 2 && y >= disc.ty - 2 && y <= disc.by + 2
  const head = box(img, 0, bt, img.W - 1, bb, (c, x, y) => !inDisc(x, y) && c[0] > 205 && c[1] > 205 && c[2] > 205)
  if (head) {
    console.log(`  title ink    x ${head.x}..${head.x1} (w ${head.w}, cx ${head.cx})  y ${head.y}..${head.y1} (h ${head.h}, cy ${head.cy})  cy inside band ${css((head.ty + head.by) / 2 - bt)}`)
    // per-row ink extent so a wrapped title can be separated
    const rows = []
    let cur = null
    for (let y = bt; y <= bb; y++) {
      const hit = box(img, 0, y, img.W - 1, y, (c, x) => !inDisc(x, y) && c[0] > 205 && c[1] > 205 && c[2] > 205)
      if (hit) { if (cur && cur.e === y - 1) cur.e = y; else { cur = { s: y, e: y, lx: hit.lx, rx: hit.rx }; rows.push(cur) } ; cur.lx = Math.min(cur.lx, hit.lx); cur.rx = Math.max(cur.rx, hit.rx) }
      else cur = null
    }
    for (const [i, r] of rows.entries())
      console.log(`               line ${i}: y ${css(r.s)}..${css(r.e)} (h ${css(r.e - r.s + 1)})  x ${css(r.lx)}..${css(r.rx)} (w ${css(r.rx - r.lx + 1)})`)
  } else console.log('  title ink    —')

  // --- body, starting below the band's antialiased edge
  const top = bb + 4
  const bottom = img.H - 46
  const strong = box(img, 0, top, img.W - 1, bottom, (c) => d(c, BG) > 90)
  show(strong, 'ink strong')
  show(box(img, 0, top, img.W - 1, bottom, (c) => d(c, BG) > 30), 'ink mid')
  show(box(img, 0, top, img.W - 1, bottom, (c) => d(c, BG) > 12), 'ink faint')

  // horizontal bands of strong ink: art vs caption
  if (strong) {
    const rows = []
    let cur = null
    for (let y = top; y <= bottom; y++) {
      let hit = 0
      for (let x = 0; x < img.W; x++) if (d(img.at(x, y), BG) > 90) hit++
      if (hit > 2) { if (cur && cur.e === y - 1) cur.e = y; else { cur = { s: y, e: y }; rows.push(cur) } }
      else cur = null
    }
    for (const [i, r] of rows.entries()) {
      const b = box(img, 0, r.s, img.W - 1, r.e, (c) => d(c, BG) > 90)
      let dark = null
      for (let y = r.s; y <= r.e; y++) for (let x = b.lx; x <= b.rx; x++) { const c = img.at(x, y); if (!dark || c[0] + c[1] + c[2] < dark[0] + dark[1] + dark[2]) dark = c }
      console.log(`  band ${i}        y ${css(r.s)}..${css(r.e)} (h ${css(r.e - r.s + 1)})  x ${b.x}..${b.x1} (w ${b.w})  gap above ${i ? css(r.s - rows[i - 1].e - 1) : 'n/a'}  darkest ${hex(dark)}`)
    }
  }
}
