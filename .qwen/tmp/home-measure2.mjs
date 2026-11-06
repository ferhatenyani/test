import sharp from 'sharp'
import path from 'node:path'
const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const S = 591 / 394
async function load(f) {
  const img = await sharp(path.join(SHOTS, f)).rotate()
  const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { info, at: (cx, cy) => { const x = Math.round(cx * S), y = Math.round(cy * S); const i = (y * info.width + x) * info.channels; return { r: data[i], g: data[i + 1], b: data[i + 2] } } }
}
const hex = (c) => '#' + [c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('')
const d3 = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))
const C = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) })

console.log('--- slide-2 card colour, four captures (sampled on flat card areas) ---')
for (const f of ['WhatsApp Image 2026-10-25 at 18.22.04.jpeg', 'WhatsApp Image 2026-10-25 at 18.56.55.jpeg', 'WhatsApp Image 2026-10-25 at 18.56.18.jpeg', 'WhatsApp Image 2026-10-25 at 18.18.55.jpeg']) {
  const im = await load(f)
  const pts = [[150, 120], [150, 140], [150, 200], [60, 120], [60, 200], [330, 120]]
  console.log(` ${f.slice(-18).padEnd(19)}`, pts.map(([x, y]) => `${x},${y}=${hex(im.at(x, y))}`).join(' '))
}

console.log('\n--- banner corner radius (box top=111, left=24) ---')
function firstNear(im, y, x0, x1, target, min) { for (let x = x0; x <= x1; x += 0.25) if (d3(im.at(x, y), target) <= min) return x; return null }
function firstNearY(im, x, y0, y1, target, min) { for (let y = y0; y <= y1; y += 0.25) if (d3(im.at(x, y), target) <= min) return y; return null }
const im2 = await load('WhatsApp Image 2026-10-25 at 18.56.55.jpeg')
const card = C('#019477')
for (const dy of [0.5, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20]) {
  const y = 111 + dy
  const x = firstNear(im2, y, 24, 90, C('#1bb495'), 45)
  console.log(`  row y=${y.toFixed(1)} (top+${dy}) first card px x=${x}${x ? '  inset ' + (x - 24).toFixed(2) : ''}`)
}
for (const dx of [0.5, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20]) {
  const x = 24 + dx
  const y = firstNearY(im2, x, 111, 160, C('#1bb495'), 45)
  console.log(`  col x=${x.toFixed(1)} (left+${dx}) first card px y=${y}${y ? '  inset ' + (y - 111).toFixed(2) : ''}`)
}

console.log('\n--- nav "Home" label + EN title colour (18.56.55 (1)) ---')
const im = await load('WhatsApp Image 2026-10-25 at 18.56.55 (1).jpeg')
function bbox(im, x0, y0, x1, y1, bg, min) {
  let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity, n = 0
  for (let y = y0; y <= y1; y += 0.25) for (let x = x0; x <= x1; x += 0.25) { const p = im.at(x, y); if (d3(p, bg) > min) { n++; a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, y); e = Math.max(e, y) } }
  return n ? { x: a, y: b, w: c - a, h: e - b, cx: (a + c) / 2, cy: (b + e) / 2, n } : null
}
const show = (l, r) => console.log(`  ${l.padEnd(24)} ${r ? `x ${r.x.toFixed(1)} y ${r.y.toFixed(1)} w ${r.w.toFixed(1)} h ${r.h.toFixed(1)} cx ${r.cx.toFixed(1)} cy ${r.cy.toFixed(1)}` : 'none'}`)
show('nav label Home', bbox(im, 50, 778, 115, 802, C('#009577'), 70))
show('nav icon Home', bbox(im, 60, 750, 105, 778, C('#009577'), 70))
show('nav icon Profile', bbox(im, 285, 750, 340, 780, C('#33354e'), 70))
show('nav label Profile', bbox(im, 275, 780, 350, 802, C('#33354e'), 70))
show('title glyphs', bbox(im, 24, 60, 200, 100, C('#101115'), 60))
console.log('  title colour sample:', hex(im.at(27, 78)), hex(im.at(150, 74)), hex(im.at(60, 80)))
console.log('  tile label colour sample:', hex(im.at(90, 276)), hex(im.at(120, 276)))
console.log('  nav label colour sample:', hex(im.at(190, 787)), hex(im.at(205, 787)))
console.log('  tile icon colour sample:', hex(im.at(107, 253)))
console.log('\n--- tile radius from AR + light captures, banner radius from slide1 ---')
const im3 = await load('WhatsApp Image 2026-10-25 at 18.56.55 (1).jpeg')
for (const dy of [0.5, 1, 2, 4, 6, 8, 10, 12, 14]) {
  const x = firstNear(im3, 111 + dy, 24, 90, C('#11716f'), 40)
  const x2 = firstNear(im3, 111 + dy, 24, 90, C('#0f7577'), 40)
  console.log(`  s1 row top+${dy} first px x=${x ?? x2}`)
}
