// throwaway: burn an image-px grid + axis labels on the upright light photo for manual calibration
import sharp from 'sharp'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'
const { data: d, info } = await sharp(T + 'profile-light-up.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const w = info.width, h = info.height
const lum = (x, y) => { const i = (y * w + x) * 4; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] }
// centre-out edge scan at several rows to find screen L/R robustly
function edges(y) {
  const cx = Math.round(w / 2)
  let l = cx; while (l > 0 && lum(l, y) > 130) l--
  let r = cx; while (r < w - 1 && lum(r, y) > 130) r++
  return [l, r]
}
for (const y of [100, 300, 600, 900, 1200, 1500, 1700, 1850, 1950, 2000]) {
  const [l, r] = edges(y)
  console.log('y=' + y, 'L=' + l, 'R=' + r, 'W=' + (r - l))
}
// vertical: centre column scan for top/bottom
let ct = 0; while (ct < h && lum(768, ct) < 130) ct++
let cb = h - 1; while (cb > 0 && lum(768, cb) < 130) cb--
console.log('centre-col top', ct, 'bottom', cb)
