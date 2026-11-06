/**
 * Scratch: is the bottom sheet full-bleed or an inset card?
 * Compares the mean colour of narrow strips at the page edges vs the centre,
 * at several rows. Near-white differences are ~7/255 so averaging over many
 * pixels is required to beat the JPEG noise.
 */
import sharp from 'sharp'
const SRC = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/WhatsApp Image 2026-10-25 at 18.35.12.jpeg'
const { data, info } = await sharp(SRC).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, CH = info.channels
const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
const hex = (c) => '#' + c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
const mean = (x0, x1, y0, y1) => {
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = at(x, y); r += c[0]; g += c[1]; b += c[2]; n++ }
  return [r / n, g / n, b / n]
}
console.log('strip means: far-left(x0-18) | left(20-38) | centre(280-310) | right(553-571) | far-right(573-590)')
for (const [y0, y1, label] of [
  [100, 140, 'above sheet (page bg)'],
  [770, 800, 'sheet: label row'],
  [840, 860, 'sheet: paste row'],
  [980, 1000, 'button row'],
  [1040, 1060, 'sheet bottom edge'],
  [1095, 1120, 'below sheet / Later'],
  [1150, 1200, 'well below sheet'],
  [1240, 1255, 'near gesture pill'],
]) {
  const c = (x0, x1) => hex(mean(x0, x1, y0, y1))
  console.log(`  y ${String(y0).padStart(4)}-${String(y1).padEnd(4)} css ${(y0 / 1.5).toFixed(0)}-${(y1 / 1.5).toFixed(0)}  ${c(0, 18)} ${c(20, 38)} ${c(280, 310)} ${c(553, 571)} ${c(573, 590)}   ${label}`)
}
console.log('\nvertical walk of the centre strip vs the far-left strip (finds the sheet top/bottom):')
for (let y = 740; y <= 1120; y += 4) {
  console.log(`  y=${String(y).padStart(4)} css=${(y / 1.5).toFixed(1)}  left(0..18)=${hex(mean(0, 18, y, y + 3))}  centre(280..310)=${hex(mean(280, 310, y, y + 3))}`)
}
