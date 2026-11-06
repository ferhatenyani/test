// throwaway final probe: 1-px bands, adaptive baselines, targeted bboxes
import sharp from 'sharp'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'
const { data: d, info } = await sharp(T + 'profile-light-up.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const w = info.width
const lum = (x, y) => { const i = (y * w + x) * 4; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] }
const rgbAt = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]] }
const L = 303, R = 1215, TOP = 25, BOT = 1987, CW = 394, CH = 853
const SCX = (R - L) / CW, SCY = (BOT - TOP) / CH
const X = (cx) => Math.round(L + cx * SCX), Y = (cy) => Math.round(TOP + cy * SCY)
const cx = (px) => Math.round(((px - L) / SCX) * 10) / 10
const cy = (py) => Math.round(((py - TOP) / SCY) * 10) / 10

function band(y0, y1, x0, x1, pred, th = 3) {
  const rows = []
  for (let y = Y(y0); y <= Y(y1); y++) { let c = 0; for (let x = X(x0); x <= X(x1); x++) if (pred(x, y)) c++; rows.push([cy(y), c]) }
  const on = rows.filter(([, c]) => c > th)
  if (!on.length) { console.log('band NOT FOUND'); return null }
  console.log('band', y0 + '-' + y1, 'rows on:', on.map(([v]) => v).join(','))
  return on
}
function bbox(y0, y1, x0, x1, pred, label) {
  let mX = 1e9, MX = -1, mY = 1e9, MY = -1, n = 0
  for (let y = Y(y0); y <= Y(y1); y++) for (let x = X(x0); x <= X(x1); x++) if (pred(x, y)) { n++; if (x < mX) mX = x; if (x > MX) MX = x; if (y < mY) mY = y; if (y > MY) MY = y }
  if (!n) { console.log(label, 'EMPTY'); return null }
  console.log(label, JSON.stringify({ x: cx(mX), y: cy(mY), x2: cx(MX), y2: cy(MY), w: cx(MX) - cx(mX), h: cy(MY) - cy(mY), n }))
  return { mX, MX, mY, MY }
}
const dark = (t) => (x, y) => lum(x, y) < t
const green = (x, y) => { const [r, g, b] = rgbAt(x, y); return g > r + 16 && g > b + 4 && lum(x, y) > 55 }
const red = (x, y) => { const [r, g, b] = rgbAt(x, y); return r > g + 40 && r > b + 40 }

// 1. avatar circle: horizontal scan at several rows through centre, find dip below card baseline
for (const ry of [60, 68, 76]) {
  const base = lum(X(120), Y(ry)) // card white left of avatar
  let l = X(197), r = X(197)
  while (l > X(120) && lum(l, Y(ry)) > base - 14) l--
  while (r < X(280) && lum(r, Y(ry)) > base - 14) r--
  let t = Y(ry), b = Y(ry)
  while (t > Y(20) && lum(X(197), t) > base - 14) t--
  while (b < Y(115) && lum(X(197), b) > base - 14) b--
  console.log('avatar row', ry, 'x', cx(l), '..', cx(r), 'w', cx(r) - cx(l), '| vert at centre', cy(t), '..', cy(b), 'h', cy(b) - cy(t))
}
// 2. name band + halves stroke density
band(108, 145, 110, 290, dark(140), 4)
bbox(112, 142, 100, 160, dark(140), 'name FERHATEN')
bbox(112, 142, 230, 290, dark(140), 'name Yani')
// 3. section labels
band(192, 214, 20, 160, dark(175), 3)
band(362, 384, 20, 100, dark(175), 3)
// 4. card edges via brightness step at row centre
for (const [tag, ry] of [['info', 250], ['set', 410]]) {
  const base = lum(X(200), Y(ry))
  let l = X(197), r = X(197)
  while (l > X(5) && Math.abs(lum(l, Y(ry)) - base) < 6) l--
  while (r < X(390) && Math.abs(lum(r, Y(ry)) - base) < 6) r++
  console.log('card', tag, 'x', cx(l + 2), '..', cx(r - 2), 'w', cx(r - 2) - cx(l + 2))
}
// 5. info rows text bands (x 78-200)
band(220, 285, 78, 200, dark(150), 4)
band(286, 352, 78, 200, dark(150), 4)
// 6. segmented control: green EN pill + track (track = darker than card by >5 in x 280-365)
bbox(392, 438, 280, 365, green, 'seg EN pill')
{
  const base = lum(X(250), Y(414))
  bbox(392, 438, 275, 370, (x, y) => lum(x, y) < base - 6 && !green(x, y) && lum(x, y) > 150, 'seg track')
}
// 7. theme control: green square + track + glyph centres
bbox(438, 484, 265, 370, green, 'theme active sq')
{
  const base = lum(X(250), Y(460))
  bbox(438, 484, 260, 372, (x, y) => lum(x, y) < base - 6 && !green(x, y) && lum(x, y) > 150, 'theme track')
}
// 8. chevrons rows 482-536 and 536-581
bbox(486, 532, 335, 372, dark(160), 'chevron 2FA')
bbox(540, 578, 335, 372, dark(160), 'chevron info')
// 9. logout precise
const lo = bbox(584, 640, 10, 385, red, 'LOGOUT red')
if (lo) {
  let inset = []
  for (let dy = 0; dy < 26; dy += 2) { let lx = -1; for (let x = lo.mX - 3; x < lo.mX + 70; x++) if (red(x, lo.mY + dy)) { lx = x; break } inset.push(`${dy}:${lx >= 0 ? Math.round((lx - lo.mX)) : -1}`) }
  console.log('logout top-left inset imgpx by dy:', inset.join(' '))
  bbox(588, 634, 100, 300, (x, y) => lum(x, y) > 215 && red(x - 6, y) === false && y > lo.mY + 2, 'logout white text')
}
// 10. icon bboxes (green) per row
bbox(230, 268, 30, 70, green, 'pin icon')
bbox(300, 336, 30, 70, green, 'calendar icon')
bbox(398, 438, 30, 75, green, 'translate icon')
bbox(444, 484, 30, 75, green, 'theme row icon')
bbox(486, 528, 30, 75, green, 'shield icon')
bbox(542, 578, 30, 75, green, 'info icon')
