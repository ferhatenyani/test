// throwaway QA probe v3: robust screen bounds + geometry off the light profile photo
import sharp from 'sharp'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'
const { data: d, info } = await sharp(T + 'profile-light-up.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const w = info.width, h = info.height, P = 4
const lum = (x, y) => { const i = (y * w + x) * P; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] }
const rgbAt = (x, y) => { const i = (y * w + x) * P; return [d[i], d[i + 1], d[i + 2]] }

// longest contiguous bright run per row = screen
function runBounds(y, th = 110) {
  let best = [0, 0, 0], cs = 0
  for (let x = 0; x <= w; x++) {
    const on = x < w && lum(x, y) > th
    if (on) { if (!cs) var s = x; cs++ }
    else { if (cs > best[2]) best = [s, x - 1, cs]; cs = 0 }
  }
  return [best[0], best[1]]
}
let top = -1, bottom = -1
for (let y = 0; y < h; y++) { const [l, r] = runBounds(y); if (r - l > 400) { top = y; break } }
for (let y = h - 1; y > 0; y--) { const [l, r] = runBounds(y); if (r - l > 400) { bottom = y; break } }
const cache = {}
const rb = (y) => cache[y] ??= runBounds(y)
const CW = 394, CH = 853
const slope = -0.0024
const toCss = (x, y) => {
  const [l, r] = rb(Math.round(y))
  const cx = (l + r) / 2 + slope * (y - (top + bottom) / 2)
  return [Math.round((CW / 2 + ((x - cx) / (r - l)) * CW) * 10) / 10, Math.round(((y - top) / (bottom - top)) * CH * 10) / 10]
}
const cssW = (px, y) => Math.round((px / (rb(Math.round(y))[1] - rb(Math.round(y))[0])) * CW * 10) / 10
const cssH = (px) => Math.round((px / (bottom - top)) * CH * 10) / 10
const rep = (label, minX, minY, maxX, maxY, n) => {
  const a = toCss(minX, minY), b = toCss(maxX, maxY)
  console.log(label.padEnd(22), JSON.stringify({ x: a[0], y: a[1], x2: b[0], y2: b[1], w: cssW(maxX - minX, (minY + maxY) / 2), h: cssH(maxY - minY) }), 'img', [minX, minY, maxX, maxY], 'n=' + n)
  return { minX, maxX, minY, maxY }
}
function blob(y0, y1, f0, f1, pred, min = 25, label = '') {
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, count = 0
  for (let y = y0; y < y1; y++) {
    const [l, r] = rb(y); if (l < 0) continue
    const xa = Math.round(l + (r - l) * f0), xb = Math.round(l + (r - l) * f1)
    for (let x = xa; x < xb; x++) if (pred(x, y)) { count++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
  }
  if (count < min) { console.log(label, 'NOT FOUND', count); return null }
  return rep(label, minX, minY, maxX, maxY, count)
}
const green = (x, y) => { const [r, g, b] = rgbAt(x, y); return g > r + 18 && g > b + 6 && lum(x, y) > 55 }
const red = (x, y) => { const [r, g, b] = rgbAt(x, y); return r > g + 45 && r > b + 45 && lum(x, y) > 65 }
const purple = (x, y) => { const [r, g, b] = rgbAt(x, y); return b > r + 10 && b > g + 16 && lum(x, y) < 125 }
console.log('screen', { top, bottom, midL: rb((top + bottom) / 2)[0], midR: rb((top + bottom) / 2)[1] })

// status bar bottom: dark glyph rows near top
const status = blob(top + 2, top + 120, 0.03, 0.97, (x, y) => lum(x, y) < 150, 30, 'status glyphs')
// header card bottom: last row (before pi label) whose centre-band mean stays card-white
function rowMean(y, f0 = 0.1, f1 = 0.9) { const [l, r] = rb(y); let s = 0, c = 0; for (let x = Math.round(l + (r - l) * f0); x < Math.round(l + (r - l) * f1); x++) { s += lum(x, y); c++ } return s / c }
let headerBottom = -1
for (let y = top + 300; y < top + 900; y++) { if (rowMean(y - 6) > 218 && rowMean(y + 10) < 214) { headerBottom = y; break } }
console.log('headerBottom', headerBottom, 'cssY', headerBottom > 0 ? toCss(0, headerBottom)[1] : '?')

// name band: dark text rows between avatar and headerBottom
const name = blob(status ? status.maxY + 10 : top + 120, headerBottom - 6, 0.05, 0.95, (x, y) => lum(x, y) < 120, 60, 'name FERHATEN')
// avatar: everything non-white above the name
const avatar = blob(status ? status.maxY + 6 : top + 120, name ? name.minY - 6 : top + 380, 0.2, 0.8, (x, y) => lum(x, y) < 210, 60, 'avatar+ring')

// PERSONAL INFORMATION label
const piLabel = blob(headerBottom + 4, headerBottom + 160, 0.02, 0.75, (x, y) => lum(x, y) < 195, 30, 'pi-label')
// info card edges: rows where >55% of span is card-white (>219)
function cardBox(y0, y1, label) {
  let ct = -1, cb = -1
  for (let y = y0; y < y1; y++) {
    const [l, r] = rb(y); let c = 0
    for (let x = l + 2; x < r - 2; x++) if (lum(x, y) > 219) c++
    if (c > (r - l) * 0.55) { if (ct < 0) ct = y; cb = y }
  }
  if (ct < 0) { console.log(label, 'no card'); return null }
  const [l, r] = rb((ct + cb) >> 1)
  let cl = -1, cr = -1
  for (let x = l; x < r; x++) { let c = 0; for (let y = ct + 8; y < cb - 8; y++) if (lum(x, y) > 219) c++; if (c > (cb - ct) * 0.6) { if (cl < 0) cl = x; cr = x } }
  return rep(label, cl, ct, cr, cb, 1)
}
const infoCard = cardBox(piLabel ? piLabel.maxY + 4 : top + 700, piLabel ? piLabel.maxY + 700 : top + 1400, 'infoCard')
if (infoCard) {
  const { minX: cl, maxX: cr, minY: ct, maxY: cb } = infoCard
  for (let y = ct + 30; y < cb - 30; y++) {
    let s = 0, c = 0
    for (let x = cl + 90; x < cr - 40; x++) { const v = lum(x, y); if (v > 200) { s += v; c++ } }
    const m = s / c
    if (m < 221) console.log('hairline?', 'imgY', y, 'cssY', toCss(0, y)[1], 'mean', m.toFixed(1))
  }
}
// settings label + card
const setLabel = blob(infoCard ? infoCard.maxY + 6 : top + 1300, infoCard ? infoCard.maxY + 200 : top + 1500, 0.02, 0.5, (x, y) => lum(x, y) < 195, 20, 'settings-label')
const setCard = cardBox(setLabel ? setLabel.maxY + 4 : top + 1450, setLabel ? setLabel.maxY + 900 : top + 2100, 'settingsCard')
// green icons in left column of both cards
for (const [y0, y1, tag] of [[infoCard?.minY, infoCard?.maxY, 'info'], [setCard?.minY, setCard?.maxY, 'set']]) {
  if (!y0) continue
  const hits = []
  for (let y = y0; y < y1; y++) { const [l, r] = rb(y); for (let x = l + 10; x < l + (r - l) * 0.25; x++) if (green(x, y)) { hits.push([x, y]); break } }
  const clusters = []
  for (const [x, y] of hits) { const c = clusters.find((c) => y - c.y1 < 14); if (c) { c.y1 = y; c.xs.push(x) } else clusters.push({ y0: y, y1: y, xs: [x] }) }
  clusters.forEach((c, k) => rep(tag + 'Icon' + k, Math.min(...c.xs), c.y0, Math.max(...c.xs), c.y1, c.xs.length))
}
// right-side green controls in settings card (seg EN pill, theme square): cluster all green x>50%
if (setCard) {
  const hits = []
  for (let y = setCard.minY; y < setCard.maxY; y++) { const [l, r] = rb(y); for (let x = Math.round(l + (r - l) * 0.5); x < r; x++) if (green(x, y)) hits.push([x, y]) }
  const clusters = []
  for (const [x, y] of hits) { const c = clusters.find((c) => y - c.y1 < 14); if (c) { c.y1 = y; c.xs.push(x); c.xmax = Math.max(c.xmax ?? c.xs[0], x) } else clusters.push({ y0: y, y1: y, xs: [x], xmax: x }) }
  clusters.forEach((c, k) => rep('greenCtl' + k, Math.min(...c.xs), c.y0, c.xmax, c.y1, c.xs.length))
  // grey track behind controls: rows in right half with lum 190..214
  for (let y = setCard.minY; y < setCard.maxY; y++) {
    const [l, r] = rb(y); let c = 0
    for (let x = Math.round(l + (r - l) * 0.62); x < r - 30; x++) { const v = lum(x, y); if (v > 185 && v < 216) c++ }
    if (c > 40) console.log('trackRow imgY', y, 'cssY', toCss(0, y)[1], 'cssX0', toCss(Math.round(l + (r - l) * 0.62), y)[0], 'n', c)
  }
}
// logout
const logout = blob(setCard ? setCard.maxY + 10 : top + 1900, bottom - 260, 0.02, 0.98, red, 500, 'LOGOUT')
if (logout) {
  const { minX: l0, minY: t0, maxX: r0, maxY: b0 } = logout
  const bodyX = toCss(l0 + 60, (t0 + b0) / 2)[0] - toCss(l0, (t0 + b0) / 2)[0]
  const prof = []
  for (let dy = 0; dy < 34; dy += 3) { let lx = -1; for (let x = l0 - 4; x < l0 + 90; x++) if (red(x, t0 + dy)) { lx = x; break } prof.push(dy + ':' + (lx >= 0 ? Math.round((toCss(lx, t0)[0] - bodyX) * 10) / 10 : '?')) }
  console.log('logout corner profile dx(css) from straight edge:', prof.join(' '))
}
// nav
const nav = blob(bottom - 330, bottom, 0.02, 0.98, purple, 500, 'navBar')
if (nav) {
  const hits = []
  for (let y = nav.minY; y <= nav.maxY; y++) { const [l, r] = rb(y); for (let x = Math.round(l + (r - l) * 0.5); x < r; x++) if (green(x, y)) hits.push([x, y]) }
  if (hits.length) rep('navActivePill', Math.min(...hits.map(([x]) => x)), Math.min(...hits.map(([, y]) => y)), Math.max(...hits.map(([x]) => x)), Math.max(...hits.map(([, y]) => y)), hits.length)
}
