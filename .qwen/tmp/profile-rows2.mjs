// throwaway: calibrate luminance at known points + compact per-CSS-px row profile
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
const imgX = (cx) => Math.round(L + cx * SCX), imgY = (cy) => Math.round(TOP + cy * SCY)

// calibration probes (CSS coords)
const probes = {
  headerCard: [100, 60], pageBg: [30, 300], infoCard: [200, 260], logoutRed: [197, 500],
  navPurple: [100, 800], nameText: [150, 118], avatarMid: [197, 60],
}
for (const [k, [cx, cy]] of Object.entries(probes)) console.log('probe', k, cssX(imgX(cx)), cssY(imgY(cy)), rgbAt(imgX(cx), imgY(cy)).join(','), 'lum', Math.round(lum(imgX(cx), imgY(cy))))

const X0 = imgX(8), X1 = imgX(386)
const rows = []
for (let cy = 0; cy <= 853; cy += 1) {
  const y = imgY(cy)
  let dark = 0, green = 0, red = 0, bright = 0, n = 0, sum = 0, firstD = 1e9, lastD = -1
  for (let x = X0; x < X1; x += 2) {
    const v = lum(x, y); n++; sum += v
    if (v > 208) bright++
    const [r, g, b] = rgbAt(x, y)
    if (g > r + 16 && g > b + 4 && v > 55) green++
    if (r > g + 40 && r > b + 40 && v > 65) red++
    if (v < 150) { dark++; if (x < firstD) firstD = x; if (x > lastD) lastD = x }
  }
  rows.push({ cy, mean: Math.round(sum / n), bright: Math.round(bright / n * 100), dark: Math.round(dark / n * 100), green: Math.round(green / n * 100), red: Math.round(red / n * 100), fd: firstD < 1e9 ? cssX(firstD) : '-', ld: lastD >= 0 ? cssX(lastD) : '-' })
}
console.log('cy mean brt drk grn red  firstDark lastDark')
for (const r of rows) console.log(`${String(r.cy).padStart(3)} ${String(r.mean).padStart(3)} ${String(r.bright).padStart(3)} ${String(r.dark).padStart(3)} ${String(r.green).padStart(3)} ${String(r.red).padStart(3)}  ${r.fd} ${r.ld}`)
