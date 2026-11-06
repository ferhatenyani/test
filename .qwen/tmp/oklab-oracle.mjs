// Oracle test v2: is lib.mjs parseColor's oklab branch equal to the pixels
// Chrome actually paints? v1 was circular: `ctx.fillStyle = 'oklab(...)'`
// serialises straight back to oklab, so parseColor(chrome) re-used my own code
// and Δ0 was guaranteed by construction. Reading the painted pixel forces a
// real colour conversion.
import { chromium } from 'playwright'
import { parseColor } from '../../scripts/qa/lib.mjs'

const SAMPLES = [
  ['oklab(0.62796 0.22486 0.12585)', '#ff0000'], // CSS Color 4 spec example
  ['oklab(0.45201 -0.00798 -0.40674)', null],
  ['oklab(0.650004 -0.12608 0.132044)', null],
  ['oklab(52.2345% 0.1772 0.1873)', null],
  ['oklab(0.999994 0.0000455678 0.0000200868 / 0.2)', null],
  ['oklab(0.7 0.05 -0.1 / 0.35)', null],
  ['oklab(0 0 0)', '#000000'],
  ['oklab(1 0 0)', '#ffffff'],
  ['oklab(0.5 -0.2 0.15)', null],
]

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent('<canvas id=c width=4 height=4></canvas>')

let worst = 0
for (const [css, known] of SAMPLES) {
  // Paint the colour at full coverage over black with alpha, then un-premultiply.
  const painted = await page.evaluate((value) => {
    const c = document.getElementById('c')
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.clearRect(0, 0, 4, 4)
    ctx.fillStyle = value
    ctx.fillRect(0, 0, 4, 4)
    const d = ctx.getImageData(1, 1, 1, 1).data
    return { r: d[0], g: d[1], b: d[2], a: d[3] }
  }, css)

  const mine = parseColor(css)
  // getImageData returns NON-premultiplied RGBA, so compare the straight channels.
  const d = Math.max(
    Math.abs(mine.r - painted.r),
    Math.abs(mine.g - painted.g),
    Math.abs(mine.b - painted.b),
  )
  const da = Math.abs((mine.a ?? 255) - painted.a)
  const hex = `#${[mine.r, mine.g, mine.b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  worst = Math.max(worst, d, da)
  const flag = known && hex.toLowerCase() !== known ? `  !! spec-example expected ${known}` : ''
  console.log(
    `${css.padEnd(46)} painted=${JSON.stringify(painted)} mine=${hex} a=${mine.a} Δrgb=${d} Δa=${da}${flag}`,
  )
}
await browser.close()
console.log(`\nworst channel delta vs painted pixels = ${worst} ${worst <= 2 ? '— PASS' : '— FAIL'}`)
process.exit(worst <= 2 ? 0 : 1)
