// throwaway: per-row feature profile of the light profile photo, 2px bins
import sharp from 'sharp'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'
const { data: d, info } = await sharp(T + 'profile-light-up.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const w = info.width
const lum = (x, y) => { const i = (y * w + x) * 4; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] }
const rgbAt = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]] }
const TOP = 25, BOT = 1987, L = 303, R = 1215
const SCX = (R - L) / 394, SCY = (BOT - TOP) / 853
const cssY = (y) => Math.round(((y - TOP) / SCY) * 10) / 10
const cssX = (x) => Math.round(((x - L) / SCX) * 10) / 10

const X0 = L + 20, X1 = R - 20
const out = []
for (let y = TOP; y < BOT; y += 2) {
  let dark = 0, green = 0, red = 0, white = 0, grey = 0, n = 0, lsum = 0
  for (let x = X0; x < X1; x += 2) {
    const v = lum(x, y); n++; lsum += v
    if (v > 219) white++
    else if (v > 200) grey++
    if (v < 120) dark++
    const [r, g, b] = rgbAt(x, y)
    if (g > r + 18 && g > b + 6 && v > 55) green++
    if (r > g + 45 && r > b + 45 && v > 65) red++
  }
  out.push({ y, cy: cssY(y), mean: Math.round(lsum / n), white: Math.round(white / n * 100), grey: Math.round(grey / n * 100), dark: Math.round(dark / n * 100), green: Math.round(green / n * 100), red: Math.round(red / n * 100) })
}
// print compactly
for (const r of out) {
  if (r.dark + r.green + r.red > 1 || r.white < 55 || r.grey > 30) {
    console.log(`y=${String(r.y).padStart(4)} css=${String(r.cy).padStart(6)} mean=${String(r.mean).padStart(3)} W=${String(r.white).padStart(3)} G=${String(r.grey).padStart(3)} D=${String(r.dark).padStart(3)} grn=${String(r.green).padStart(2)} red=${String(r.red).padStart(2)}`)
  }
}
