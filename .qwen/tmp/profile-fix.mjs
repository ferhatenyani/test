// corrected probes: avatar circle, card L/R edges, seg/theme track edges, status bar bottom
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

// status bar: last row above y=60(css) with dark glyph pixels in outer thirds
let sb = 0
for (let y = Y(2); y < Y(60); y++) { let c = 0; for (let x = X(10); x < X(120); x++) if (lum(x, y) < 150) c++; if (c > 2) sb = y }
console.log('status bar bottom css', cy(sb))

// avatar: row scan at multiple y, outward from centre until 6 consecutive px within 8 of card base
const baseA = lum(X(140), Y(72))
for (const ry of [62, 72, 82]) {
  const out = []
  for (const dir of [-1, 1]) {
    let x = X(197), stable = 0
    while (x > X(140) && x < X(260) && stable < 5) {
      x += dir
      if (Math.abs(lum(x, Y(ry)) - baseA) < 8 && Math.abs(lum(x + dir * 4, Y(ry)) - baseA) < 8) stable++; else stable = 0
    }
    out.push(cx(x - dir * 6))
  }
  console.log('avatar row', ry, 'edges', out[0], out[1], 'w', out[1] - out[0])
}
for (const rx of [185, 197, 209]) {
  let t = Y(72), st = 0
  while (t > Y(30) && st < 5) { t--; if (Math.abs(lum(X(rx), t) - baseA) < 8 && Math.abs(lum(X(rx), t - 4) - baseA) < 8) st++; else st = 0 }
  let b = Y(72); st = 0
  while (b < Y(115) && st < 5) { b++; if (Math.abs(lum(X(rx), b) - baseA) < 8 && Math.abs(lum(X(rx), b + 4) - baseA) < 8) st++; else st = 0 }
  console.log('avatar col', rx, 'top', cy(t + 4), 'bottom', cy(b - 4), 'h', cy(b - 4) - cy(t + 4))
}
// card edges: at rows without text, find where lum rises to card level (>base) from page grey
for (const [tag, ry, probe] of [['info', 226, 200], ['info2', 345, 200], ['set', 396, 200], ['set2', 575, 200]]) {
  const pageL = lum(X(8), Y(ry)), cardL = lum(X(200), Y(ry))
  let l = X(60), r = X(340)
  const thr = (pageL + cardL) / 2
  while (l > X(2) && lum(l, Y(ry)) > thr) l--
  while (r < X(392) && lum(r, Y(ry)) > thr) r++
  console.log('card edge', tag, 'L', cx(l + 3), 'R', cx(r - 3), 'W', cx(r - 3) - cx(l + 3), 'page', Math.round(pageL), 'card', Math.round(cardL))
}
// seg track + theme track: scan row through their centres, track = < card-10 and > card-40, not green
const green = (x, y) => { const [r, g, b] = rgbAt(x, y); return g > r + 16 && g > b + 4 }
for (const [tag, ry, x0, x1] of [['seg', 414, 275, 375], ['theme', 460, 255, 375]]) {
  const cardB = lum(X(230), Y(ry))
  let l = -1, r = -1
  for (let x = X(x0); x < X(x1); x++) { const v = lum(x, Y(ry)); if (!green(x, Y(ry)) && v < cardB - 8 && v > cardB - 45) { if (l < 0) l = x; r = x } }
  let t = -1, b = -1
  for (let y = Y(ry - 25); y < Y(ry + 25); y++) { const v = lum(X(tag === 'seg' ? 350 : 340), y); if (v < cardB - 8 && v > cardB - 45) { if (t < 0) t = y; b = y } }
  console.log('track', tag, 'x', cx(l), cx(r), 'w', cx(r) - cx(l), 'y', cy(t), cy(b), 'h', cy(b) - cy(t))
}
// header card bottom precise: centre column band mean
let hb = -1
for (let y = Y(150); y < Y(210); y++) { let s = 0, c = 0; for (let x = X(30); x < X(80); x++) { s += lum(x, y); c++ } if (s / c < 196) { hb = y; break } }
console.log('header card bottom css', cy(hb))
// info card top/bottom & settings top/bottom via left-inside column x=40 (icon-free at edges? use x=250 no text rows)
function vcard(x0, x1, y0, y1, label) {
  const rowsOn = []
  for (let y = Y(y0); y < Y(y1); y++) { let s = 0, c = 0; for (let x = X(x0); x < X(x1); x++) { s += lum(x, y); c++ } if (s / c > 206) rowsOn.push(y) }
  if (!rowsOn.length) { console.log(label, 'none'); return }
  console.log(label, 'top', cy(rowsOn[0]), 'bottom', cy(rowsOn[rowsOn.length - 1]), 'h', cy(rowsOn[rowsOn.length - 1]) - cy(rowsOn[0]))
}
vcard(250, 340, 210, 360, 'info card')
vcard(250, 340, 382, 590, 'settings card')
// hairlines: dips inside info card at x 250-340
for (let y = Y(280); y < Y(292); y++) { let s = 0, c = 0; for (let x = X(250); x < X(340); x++) { s += lum(x, y); c++ } console.log('hair', cy(y), (s / c).toFixed(1)) }
// logout top/bottom precise + radius via left inset at rows
let lt = -1, lb = -1
for (let y = Y(584); y < Y(640); y++) { let c = 0; for (let x = X(30); x < X(360); x++) { const [r, g, b] = rgbAt(x, y); if (r > g + 40 && r > b + 40) c++ } if (c > 50) { if (lt < 0) lt = y; lb = y } }
console.log('logout y', cy(lt), cy(lb), 'h', cy(lb) - cy(lt))
const bodyL = (() => { for (let x = X(5); x < X(60); x++) { const [r, g, b] = rgbAt(x, Y((lt + lb) / 2)); if (r > g + 40 && r > b + 40) return x } })()
let prof = []
for (let dy = 0; dy <= 24; dy += 3) { let lx = -1; for (let x = X(5); x < X(80); x++) { const [r, g, b] = rgbAt(x, lt + dy); if (r > g + 40 && r > b + 40) { lx = x; break } } prof.push(`${dy}:${lx >= 0 ? (cx(lx) - cx(bodyL)).toFixed(1) : '?'}`) }
console.log('logout inset by dy(css):', prof.join(' '), 'bodyL', cx(bodyL))
