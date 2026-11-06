// throwaway: rotate the sideways dark profile photo + report sizes of refs
import sharp from 'sharp'
const S = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'

const dark = S + 'WhatsApp Image 2026-10-25 at 18.34.09 (1).jpeg'
const m = await sharp(dark).metadata()
console.log('dark raw', m.width, m.height, 'orientation', m.orientation)
// phone top is at image LEFT -> rotate 90 CW to make portrait
await sharp(dark).rotate(90).jpeg({ quality: 92 }).toFile(T + 'profile-dark-rot.jpg')
const r = await sharp(T + 'profile-dark-rot.jpg').metadata()
console.log('rotated', r.width, r.height)

const light = S + 'WhatsApp Image 2026-10-25 at 18.34.09.jpeg'
const lm = await sharp(light).metadata()
console.log('light raw', lm.width, lm.height, 'orientation', lm.orientation)
// also emit an EXIF-corrected portrait copy for pixel work
await sharp(light).rotate().jpeg({ quality: 92 }).toFile(T + 'profile-light-up.jpg')
const lum = await sharp(T + 'profile-light-up.jpg').metadata()
console.log('light upright', lum.width, lum.height)
