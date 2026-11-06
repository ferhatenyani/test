// throwaway QA probe: geometry off the light profile photo + colours off clean captures
import sharp from 'sharp'

const S = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'

async function rgb(file) {
  const { data, info } = await sharp(file).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { d: data, w: info.width, h: info.height, ch: 4 }
}
const LUM = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]

// ---------- light photo geometry ----------
const img = await rgb(T + 'profile-light-up.jpg')
const { d, w, h } = img

// screen bounds: bright vs dark cloth
function rowBounds(y, th = 110) {
  let l = -1, r = -1
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const b = LUM(d, i)
    if (b > th) { if (l < 0) l = x; r = x }
  }
  return [l, r]
}
const rows = []
for (let y = 0; y < h; y++) {
  const [l, r] = rowBounds(y)
  rows.push([l, r])
}
let top = rows.findIndex(([l, r]) => l >= 0 && r - l > 300)
let bottom = -1
for (let y = h - 1; y > 0; y--) { const [l, r] = rows[y]; if (l >= 0 && r - l > 300) { bottom = y; break } }
const midL = rows[Math.round((top + bottom) / 2)]
console.log('screen', { top, bottom, hpx: bottom - top, midL: midL[0], midR: midL[1], wpx: midL[1] - midL[0] })
// tilt: fit center x over y
let n = 0, sx = 0, sy = 0, sxy = 0, sxx = 0
for (let y = top + 40; y < bottom - 40; y += 7) {
  const [l, r] = rows[y]; if (l < 0) continue
  const cx = (l + r) / 2; n++; sx += y; sy += cx; sxy += y * cx; sxx += y * y
}
const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
const intercept = (sy - slope * sx) / n
console.log('tilt dx/dy =', slope.toFixed(4), '(deg', (Math.atan(slope) * 180 / Math.PI).toFixed(2) + ')')

const LW = (y) => { const [l, r] = rows[Math.max(top, Math.min(bottom, Math.round(y)))]; return r - l }
const LL = (y) => { const [l] = rows[Math.max(top, Math.min(bottom, Math.round(y)))]; return l + slope * (y - (top + bottom) / 2) * 0 + 0 }
// CSS mapping: assume photographed device is the same phone as a394 captures: 394x853 CSS
const CW = 394, CH = 853
const toCss = (x, y) => {
  const l = rows[Math.max(top, Math.min(bottom, Math.round(y)))]
  const cx = l[0] + (l[1] - l[0]) / 2 + slope * (y - (top + bottom) / 2) // de-tilt about centre
  const half = (l[1] - l[0]) / 2
  const u = (x - cx) / (half * 2)
  return [Math.round(u * CW * 10) / 10, Math.round(((y - top) / (bottom - top)) * CH * 10) / 10]
}
const cssW = (px, y) => Math.round((px / LW(y)) * CW * 10) / 10
const cssH = (px) => Math.round((px / (bottom - top)) * CH * 10) / 10

function scanRegion(y0, y1, x0f, x1f, pred, label) {
  // x0f..x1f as fractions of the row's screen span
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, count = 0
  for (let y = y0; y < y1; y++) {
    const [l, r] = rows[y]; if (l < 0) continue
    const xa = Math.round(l + (r - l) * x0f), xb = Math.round(l + (r - l) * x1f)
    for (let x = xa; x < xb; x++) {
      const i = (y * w + x) * 4
      if (pred(d, i)) { count++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
    }
  }
  if (count < 20) { console.log(label, 'NOT FOUND (px=' + count + ')'); return null }
  const [cx1, cy1] = toCss(minX, minY), [cx2, cy2] = toCss(maxX, maxY)
  console.log(label, { img: [minX, minY, maxX, maxY], px: count, css: { x: cx1, y: cy1, x2: cx2, y2: cy2, w: cssW(maxX - minX, (minY + maxY) / 2), h: cssH(maxY - minY) } })
  return { minX, maxX, minY, maxY }
}

const green = (dd, i) => dd[i + 1] > dd[i] + 18 && dd[i + 1] > dd[i + 2] + 8 && LUM(dd, i) > 60
const red = (dd, i) => dd[i] > dd[i + 1] + 45 && dd[i] > dd[i + 2] + 45 && LUM(dd, i) > 70
const darkTxt = (dd, i) => LUM(dd, i) < 115
const purple = (dd, i) => dd[i + 2] > dd[i] + 12 && dd[i + 2] > dd[i + 1] + 18 && LUM(dd, i) < 130

// header card bottom: find where full-bleed white band ends (row-mean brightness drop)
function meanBright(y, f0 = 0.15, f1 = 0.85) {
  const [l, r] = rows[y]; let s = 0, c = 0
  for (let x = Math.round(l + (r - l) * f0); x < Math.round(l + (r - l) * f1); x++) { s += LUM(d, (y * w + x) * 4); c++ }
  return s / c
}
let headerBottom = -1
for (let y = top + 200; y < top + 700; y++) {
  if (meanBright(y - 12) > 215 && meanBright(y + 12) < 208) { headerBottom = y; break }
}
console.log('header card bottom img y =', headerBottom, 'css y =', headerBottom > 0 ? toCss(0, headerBottom)[1] : '?')

scanRegion(top + 60, top + 420, 0.25, 0.75, darkTxt, 'avatar+name dark band')
scanRegion(top + 60, top + 260, 0.3, 0.7, (dd, i) => LUM(dd, i) < 170, 'avatar (darker core)')
scanRegion(top + 260, top + 470, 0.2, 0.8, darkTxt, 'name text')
scanRegion(top + 470, top + 560, 0.05, 0.6, (dd, i) => LUM(dd, i) < 190, 'PERSONAL INFORMATION label')
scanRegion(top + 540, headerBottom > 0 ? headerBottom + 520 : top + 1080, 0.02, 0.98, green, 'green icons (info+settings cards)')
scanRegion(top + 540, top + 1000, 0.05, 0.95, (dd, i) => LUM(dd, i) < 140, 'dark text in cards')
scanRegion(top + 1000, top + 1400, 0.05, 0.95, red, 'LOGOUT red')
scanRegion(top + 1350, bottom, 0.05, 0.95, purple, 'nav bar purple')
scanRegion(top + 1350, bottom, 0.05, 0.95, green, 'nav active green pill')

// card edges: scan a horizontal line through the info card and logout for white-vs-grey transitions
function edgeScan(y, label) {
  const [l, r] = rows[y]; const out = []
  let prev = null
  for (let x = l + 5; x < r - 5; x++) {
    const i = (y * w + x) * 4
    const b = Math.round(LUM(d, i) / 8) * 8
    if (b !== prev) { out.push([x, b]); prev = b }
  }
  console.log('edgeScan', label, 'y=', y, out.filter(([x, b], k) => k === 0 || Math.abs(out[k - 1][1] - b) >= 8).slice(0, 40).map(([x, b]) => [Math.round(toCss(x, y)[0]), b]).join(' '))
}
edgeScan(headerBottom + 300, 'info card mid')
edgeScan(headerBottom + 640, 'settings lang row')
edgeScan(headerBottom + 800, 'logout mid')
