// Clean geometry extractor for a login image (capture OR render).
// Prints CSS px; app-y = cssY - STATUS (capture has a 38-device status strip, renders do not).
// node geom.mjs <path-or-capture> [statusCssPx]
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'
const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const a = process.argv[2]
const STATUS = Number(process.argv[3] ?? 25.3)
const src = fs.existsSync(a) ? a : path.join(SHOTS, a)
const { data, info } = await sharp(src).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, CH = info.channels
const S = W === 540 ? 1.5 : 591 / 394
const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
const D = (p, q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]))
const hx = (c) => '#' + c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
const K = (n) => +(n / S).toFixed(1)
const A = (n) => +(K(n) - STATUS).toFixed(1)          // app-y
const rgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
const L = (p) => (p[0] + p[1] + p[2]) / 3
const out = []
const p = (s) => out.push(s)

function box(pred, win) {
  const [x0, y0, x1, y1] = win
  let a = 1e9, b = 1e9, c = -1, e = -1, n = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pred(at(x, y))) { n++; a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, y); e = Math.max(e, y) }
  return n ? { x0: a, x1: c, y0: b, y1: e, n } : null
}
const line = (tag, r) => r ? p(`${tag.padEnd(14)} x ${K(r.x0)}..${K(r.x1)}  w ${K(r.x1 - r.x0 + 1).toString().padStart(6)} | cssY ${K(r.y0)}..${K(r.y1)}  appY ${A(r.y0)}..${A(r.y1)}  h ${K(r.y1 - r.y0 + 1)} | cx ${K((r.x0 + r.x1) / 2)} cy ${A((r.y0 + r.y1) / 2)} | n=${r.n}`) : p(`${tag.padEnd(14)} none`)
const med = (arr) => arr.sort((x, y) => x - y)[arr.length >> 1]
function fillIn(tag, x0, y0, x1, y1) {
  const px = []
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px.push(at(x, y))
  p(`  ${tag.padEnd(18)} ${hx([0, 1, 2].map((k) => med(px.map((q) => q[k]))))}`)
}
function textInk(tag, win, darkOn, thr) {
  // darkOn=true -> ink darker than bg; else ink lighter
  const r = box((q) => (darkOn ? L(q) < thr : L(q) > thr), win)
  if (!r) return p(`${tag.padEnd(14)} none`)
  const px = []
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const q = at(x, y); if (darkOn ? L(q) < thr : L(q) > thr) px.push(q) }
  const core = [0, 1, 2].map((k) => Math[darkOn ? 'min' : 'max'](...px.map((q) => q[k])))
  line(tag, r)
  p(`    core colour ${hx(core)}   median ${hx([0, 1, 2].map((k) => med(px.map((q) => q[k]))))}`)
}

const GREEN = rgb('009577')
const isGreen = (q) => D(q, GREEN) < 55 && q[1] > q[0] + 20
const isWhite = (q) => Math.min(q[0], q[1], q[2]) > 240

p(`### ${path.basename(src)}  ${W}x${H}dev  status=${STATUS}`)
// ---- green band
{
  const r = box(isGreen, [0, 0, W - 1, 300])
  line('band', r)
  p(`    colour ${hx(at(Math.round(W / 2), Math.round((r.y0 + r.y1) / 2)))}`)
  // bottom-left corner: bottom green y per device x
  const prof = []
  for (let x = 0; x <= Math.min(r.y1, 90); x += 2) { let y = r.y1; while (y > 0 && !isGreen(at(x, y))) y--; prof.push(`${K(x)}:${A(y)}`) }
  p(`    corner cssX:appY  ${prof.join(' ')}`)
}
// ---- logo card (white blob in band region)
{
  const r = box(isWhite, [0, 60, W - 1, 470])
  line('logoCard', r)
  // top-left corner profile
  const prof = []
  for (let x = r.x0; x <= r.x0 + 60; x += 2) { let y = r.y0; while (y < r.y0 + 80 && !isWhite(at(x, y))) y++; prof.push(`${K(x)}:${A(y)}`) }
  p(`    tl corner cssX:appY ${prof.join(' ')}`)
  fillIn('card fill', r.x0 + 6, r.y0 + 6, r.x0 + 20, r.y0 + 20)
  // logo artwork ink inside the card (any non-white pixel)
  const art = box((q) => Math.min(q[0], q[1], q[2]) < 235, [r.x0 + 2, r.y0 + 2, r.x1 - 2, r.y1 - 2])
  line('logoArt', art)
}
// ---- title + underline (between logo card and form card)
{
  const card = box(isWhite, [0, 60, W - 1, 470])
  const y0 = card ? card.y1 + 2 : 360
  textInk('title', [0, y0, W - 1, y0 + 130], true, 150)
  const u = box(isGreen, [0, y0 + 90, W - 1, y0 + 260])
  line('underline', u)
}
// ---- form card
{
  const fc = box(isWhite, [10, 460, W - 10, H - 60])
  line('formCard', fc)
  p(`    colour ${hx(at(Math.round(fc.x1 - 8), Math.round(fc.y0 + 8)))}`)
  const prof = []
  for (let x = fc.x0; x <= fc.x0 + 60; x += 2) { let y = fc.y0; while (y < fc.y0 + 90 && !isWhite(at(x, y))) y++; prof.push(`${K(x)}:${A(y)}`) }
  p(`    tl corner cssX:appY ${prof.join(' ')}`)
  // pills inside: rows where >25% of card width is a single non-card colour
  const t = at(Math.round(W / 2), 605)
  const isFill = (q) => D(q, t) < 14
  const rows = []
  for (let y = fc.y0; y <= fc.y1; y++) { let n = 0; for (let x = fc.x0; x <= fc.x1; x++) if (isFill(at(x, y))) n++; if (n > (fc.x1 - fc.x0) * 0.3) rows.push(y) }
  const bands = []
  for (const y of rows) { const l = bands.at(-1); if (l && y - l[1] <= 6) l[1] = y; else bands.push([y, y]) }
  bands.forEach(([s, e], i) => {
    const mid = (s + e) >> 1
    let a2 = -1
    const spans = []
    for (let x = fc.x0; x <= fc.x1 + 1; x++) { const hit = x <= fc.x1 && isFill(at(x, mid)); if (hit && a2 < 0) a2 = x; if (!hit && a2 >= 0) { spans.push([a2, x - 1]); a2 = -1 } }
    const sp = spans.sort((m, n) => (m[1] - m[0]) - (n[1] - n[0])).at(-1)
    p(`pill${i}       x ${K(sp[0])}..${K(sp[1])} w ${K(sp[1] - sp[0] + 1)} | appY ${A(s)}..${A(e)} h ${K(e - s + 1)} | cy ${A((s + e) / 2)}`)
    // border: scan outward from the fill edge on the mid row
    const bl = []
    for (let x = sp[0] - 4; x <= sp[0]; x++) bl.push(`${K(x)}=${hx(at(x, mid))}`)
    p(`    left border ${bl.join(' ')}`)
    const bt = []
    for (let y = s - 4; y <= s; y++) bt.push(`${A(y)}=${hx(at(Math.round((sp[0] + sp[1]) / 2), y))}`)
    p(`    top border ${bt.join(' ')}`)
    fillIn('pill fill', sp[0] + 40, s + 4, sp[1] - 40, e - 4)
  })
  // labels: ink rows between pills
  const zones = [[fc.y0, bands[0] ? bands[0][0] : fc.y0 + 40], [bands[0] ? bands[0][1] : fc.y0 + 40, bands[1] ? bands[1][0] : fc.y0 + 120]]
  zones.forEach(([s, e], i) => textInk(`label${i}`, [fc.x0, s + 1, fc.x1, e - 1], true, 190))
  // leading icon inside pill0 (ink near the left end)
  if (bands[0]) textInk('icon0', [bands[0][0] - 4, bands[0][0], bands[0][0] + 90, bands[0][1]], true, 190)
  if (bands[1]) textInk('icon1', [bands[1][0] - 4, bands[1][0], bands[1][0] + 90, bands[1][1]], true, 190)
}
// ---- button
{
  const r = box(isGreen, [0, 700, W - 1, 1050])
  line('button', r)
  p(`    colour ${hx(at(Math.round(r.x0 + 10), Math.round((r.y0 + r.y1) / 2)))}`)
  const prof = []
  for (let dy = 0; dy <= (r.y1 - r.y0) / 2; dy += 2) { let x = r.x0; while (x < r.x0 + 60 && !isGreen(at(x, r.y0 + dy))) x++; prof.push(`${A(r.y0 + dy)}:${K(x)}`) }
  p(`    tl corner appY:cssX ${prof.join(' ')}`)
  textInk('btnLabel', [r.x0, r.y0, r.x1, r.y1], false, 205)
}
// ---- footer
textInk('footer', [80, 1000, W - 80, 1140], true, 200)
// ---- page bg
fillIn('page bg', 10, 1020, 60, 1060)
fillIn('status strip', 150, 8, 400, 30)
console.log(out.join('\n'))
fs.writeFileSync('C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/geom-out.txt', out.join('\n'))
