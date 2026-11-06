// throwaway QA probe v2: geometry off the light profile photo
import sharp from 'sharp'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'

const { data: d, info } = await sharp(T + 'profile-light-up.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const w = info.width, h = info.height, P = 4
const lum = (x, y) => { const i = (y * w + x) * P; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] }
const rgbAt = (x, y) => { const i = (y * w + x) * P; return [d[i], d[i + 1], d[i + 2]] }

// ---- screen bounds (bright screen vs dark cloth) ----
let top = 0, bottom = h - 1
const isScreen = (x, y) => lum(x, y) > 95
function rowBounds(y) {
  let l = -1, r = -1
  for (let x = 0; x < w; x++) if (isScreen(x, y)) { l = x; break }
  for (let x = w - 1; x >= 0; x--) if (isScreen(x, y)) { r = x; break }
  return [l, r]
}
for (let y = 0; y < h; y++) { const [l, r] = rowBounds(y); if (r - l > 400) { top = y; break } }
for (let y = h - 1; y > 0; y--) { const [l, r] = rowBounds(y); if (r - l > 400) { bottom = y; break } }
const CW = 394, CH = 853
const rowsCache = {}
const rb = (y) => rowsCache[y] ??= rowBounds(y)
const slope = -0.0024
const toCss = (x, y) => {
  const [l, r] = rb(Math.round(y))
  const cx = (l + r) / 2 + slope * (y - (top + bottom) / 2)
  return [Math.round((CW / 2 + ((x - cx) / (r - l)) * CW) * 10) / 10, Math.round(((y - top) / (bottom - top)) * CH * 10) / 10]
}
const cssW = (px, y) => Math.round((px / (rb(Math.round(y))[1] - rb(Math.round(y))[0])) * CW * 10) / 10
const cssH = (px) => Math.round((px / (bottom - top)) * CH * 10) / 10
console.log('screen', { top, bottom, wpx: rb((top + bottom) / 2)[1] - rb((top + bottom) / 2)[0], hpx: bottom - top })

function blob(y0, y1, f0, f1, pred, min = 25, label = '') {
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, count = 0
  for (let y = y0; y < y1; y++) {
    const [l, r] = rb(y); if (l < 0) continue
    const xa = Math.round(l + (r - l) * f0), xb = Math.round(l + (r - l) * f1)
    for (let x = xa; x < xb; x++) if (pred(x, y)) { count++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
  }
  if (count < min) { console.log(label || 'blob', 'NOT FOUND', count); return null }
  const a = toCss(minX, minY), b = toCss(maxX, maxY)
  const o = { label, img: [minX, minY, maxX, maxY], n: count, css: { x: a[0], y: a[1], x2: b[0], y2: b[1], w: cssW(maxX - minX, (minY + maxY) / 2), h: cssH(maxY - minY) } }
  console.log(JSON.stringify(o))
  return o
}
const green = (x, y) => { const [r, g, b] = rgbAt(x, y); return g > r + 18 && g > b + 6 && lum(x, y) > 55 }
const red = (x, y) => { const [r, g, b] = rgbAt(x, y); return r > g + 45 && r > b + 45 && lum(x, y) > 65 }
const purple = (x, y) => { const [r, g, b] = rgbAt(x, y); return b > r + 10 && b > g + 16 && lum(x, y) < 125 }
const dark = (t) => (x, y) => lum(x, y) < t

// ---- header card bottom: column-mean luminance drop, centre band ----
function rowMean(y, f0 = 0.12, f1 = 0.88) { const [l, r] = rb(y); let s = 0, c = 0; for (let x = Math.round(l + (r - l) * f0); x < Math.round(l + (r - l) * f1); x++) { s += lum(x, y); c++ } return s / c }
let headerBottom = -1
for (let y = top + 250; y < top + 800; y++) { if (rowMean(y - 15) - rowMean(y + 15) > 6) { headerBottom = y; break } }
console.log('headerBottom img', headerBottom, 'css y', headerBottom > 0 ? toCss(0, headerBottom)[1] : '?')

// ---- avatar: any non-white blob in header below status bar, above name ----
const avatar = blob(top + 90, top + 380, 0.28, 0.72, (x, y) => lum(x, y) < 205, 60, 'avatar+ring')
// ---- name text band ----
const name = blob(top + 380, headerBottom > 0 ? headerBottom - 4 : top + 560, 0.1, 0.9, dark(120), 40, 'name')
// ---- PERSONAL INFORMATION label ----
const piLabel = blob(headerBottom + 2, headerBottom + 130, 0.02, 0.7, dark(200), 30, 'pi-label')
// ---- info card: white on grey — find via bright rows between labels ----
function cardEdges(y0, y1, x0, x1) {
  const isCard = (x, y) => lum(x, y) > 222
  let top2 = -1, bot = -1, lft = -1, rgt = -1
  for (let y = y0; y < y1; y++) { let c = 0; for (let x = x0; x < x1; x++) if (isCard(x, y)) c++; if (c > (x1 - x0) * 0.5) { if (top2 < 0) top2 = y; bot = y } }
  for (let x = x0; x < x1; x++) { let c = 0; for (let y = top2; y < bot; y++) if (isCard(x, y)) c++; if (c > (bot - top2) * 0.5) { if (lft < 0) lft = x; rgt = x } }
  const a = toCss(lft, top2), b = toCss(rgt, bot)
  return { css: { x: a[0], y: a[1], x2: b[0], y2: b[1], w: cssW(rgt - lft, (top2 + bot) / 2), h: cssH(bot - top2) }, img: [lft, top2, rgt, bot] }
}
if (piLabel) {
  const infoCard = cardEdges(piLabel.img[3] + 10, piLabel.img[3] + 560, rb(piLabel.img[3] + 300)[0], rb(piLabel.img[3] + 300)[1])
  console.log('infoCard', JSON.stringify(infoCard))
  // hairline between the two rows: darkest row inside card, centre span, excluding text rows
  const [cl, ct, cr, cb] = infoCard.img
  let best = []
  for (let y = ct + 40; y < cb - 40; y++) {
    let s = 0, c = 0
    for (let x = cl + 60; x < cr - 20; x++) { const v = lum(x, y); if (v > 215) { s += v; c++ } }
    if (c > (cr - cl) * 0.3) best.push([y, s / c])
  }
  best.sort((a, b) => a[1] - b[1])
  console.log('hairline candidate rows (img y, meanLum):', best.slice(0, 6).map(([y, v]) => [y, Math.round(v)]).join(' | '))
}
// ---- green icon column across both cards ----
const icons = blob(piLabel ? piLabel.img[3] : top + 600, piLabel ? piLabel.img[3] + 1150 : top + 1750, 0.05, 0.95, green, 100, 'all-green')
// per-icon: cluster green pixels by y
{
  const y0 = piLabel ? piLabel.img[3] : top + 600, y1 = piLabel ? piLabel.img[3] + 1150 : top + 1750
  const hits = []
  for (let y = y0; y < y1; y++) { const [l, r] = rb(y); for (let x = l; x < r; x++) { if (green(x, y)) { hits.push([x, y]); break } } }
  const clusters = []
  for (const [x, y] of hits) { const c = clusters.find((c) => y - c.y1 < 12); if (c) { c.y1 = y; c.xs.push(x) } else clusters.push({ y0: y, y1: y, xs: [x] }) }
  for (const c of clusters) {
    const xs = c.xs, mx = Math.min(...xs)
    const a = toCss(mx, c.y0), b = toCss(Math.max(...xs), c.y1)
    console.log('greenIcon css', JSON.stringify({ x: a[0], y: a[1], x2: b[0], y2: b[1], w: cssW(Math.max(...xs) - mx, (c.y0 + c.y1) / 2), h: cssH(c.y1 - c.y0) }))
  }
}
// ---- segmented control (row 1 of settings card): green EN pill + grey track ----
const seg = blob(top + 600, top + 1750, 0.5, 0.98, (x, y) => { const [r, g, b] = rgbAt(x, y); return g > r + 18 && g > b + 6 && lum(x, y) > 55 }, 30, 'seg-EN-green')
// theme active square (green, right side, below seg)
if (seg) blob(seg.img[3] + 20, seg.img[3] + 260, 0.5, 0.98, green, 30, 'theme-active-square')
// ---- logout red ----
const logout = blob(top + 900, bottom - 250, 0.02, 0.98, red, 500, 'LOGOUT')
if (logout) {
  // radius: leftmost red x per row near the top edge
  const [l0, t0, r0, b0] = logout.img
  const prof = []
  for (let y = t0; y < t0 + 40; y += 4) { let lx = -1; for (let x = l0 - 5; x < l0 + 80; x++) if (red(x, y)) { lx = x; break } prof.push([Math.round(toCss(lx, y)[0] - toCss(l0, t0 + 60)[0]), y - t0]) }
  console.log('logout left-edge profile (dxCss from body, dyImg):', prof.map(([a, b]) => `${b}:${a}`).join(' '))
}
// ---- nav bar ----
const nav = blob(bottom - 320, bottom, 0.02, 0.98, purple, 500, 'nav-bar')
if (nav) blob(nav.img[1], nav.img[3], 0.5, 0.99, green, 200, 'nav-active-pill')
