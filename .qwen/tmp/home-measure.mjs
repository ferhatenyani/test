/**
 * One-off transcription of the home reference captures.
 * Prints CSS-px edges (device px / 1.5) for every home component so the spec
 * numbers come from the pixels, not from eyeballing a grid overlay.
 */
import sharp from 'sharp'
import path from 'node:path'

const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const S = 591 / 394

async function load(f) {
  const img = await sharp(path.join(SHOTS, f)).rotate()
  const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return {
    info,
    at: (cx, cy) => {
      const x = Math.round(cx * S)
      const y = Math.round(cy * S)
      const i = (y * info.width + x) * info.channels
      return { r: data[i], g: data[i + 1], b: data[i + 2] }
    },
  }
}
const hex = (c) => '#' + [c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('')
const dist = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.b ? Math.abs(a.g - b.g) : 0), Math.abs(a.b - b.b))
const d3 = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))
const C = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) })

/** tight box of pixels in [x0..x1]x[y0..y1] differing from bg by > min */
function bbox(im, x0, y0, x1, y1, bg, min) {
  let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity, n = 0
  for (let y = y0; y <= y1; y += 0.25) for (let x = x0; x <= x1; x += 0.25) {
    const p = im.at(x, y)
    if (d3(p, bg) > min) { n++; a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, y); e = Math.max(e, y) }
  }
  if (!n) return null
  return { x: a, y: b, w: c - a, h: e - b, x1: c, y1: e, cx: (a + c) / 2, cy: (b + e) / 2, n }
}
/** first x >= x0 along row y where colour is near `target` */
function firstNear(im, y, x0, x1, target, min) {
  for (let x = x0; x <= x1; x += 0.25) if (d3(im.at(x, y), target) <= min) return x
  return null
}
/** first y >= y0 along col x where colour is near `target` */
function firstNearY(im, x, y0, y1, target, min) {
  for (let y = y0; y <= y1; y += 0.25) if (d3(im.at(x, y), target) <= min) return y
  return null
}
const show = (label, r) =>
  console.log(`  ${label.padEnd(26)} ${r ? `x ${r.x.toFixed(1)} y ${r.y.toFixed(1)} w ${r.w.toFixed(1)} h ${r.h.toFixed(1)}  x1 ${r.x1.toFixed(1)} y1 ${r.y1.toFixed(1)}  cx ${r.cx.toFixed(1)} cy ${r.cy.toFixed(1)}` : 'none'}`)

const TILE = C('#019477')
const PAGE_D = C('#101115')
const NAVBG = C('#33354e')

async function report(file, title) {
  const im = await load(file)
  console.log(`\n### ${title}  (${file})`)

  console.log(' -- banner box --')
  const bTop = firstNearY(im, 197, 95, 200, TILE, 90)
  console.log(`   banner top y at x=197: ${bTop}`)

  console.log(' -- corner radius probe (tile row1, top=235.5 left=24) --')
  for (const dy of [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) {
    const y = 235.5 + dy
    const x = firstNear(im, y, 24, 60, TILE, 40)
    console.log(`   row y=${y.toFixed(1)} (top+${dy}) first tile px x=${x}`)
  }
  for (const dx of [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) {
    const x = 24 + dx
    const y = firstNearY(im, x, 235.5, 270, TILE, 40)
    console.log(`   col x=${x.toFixed(1)} (left+${dx}) first tile px y=${y}`)
  }

  console.log(' -- tile1 interior (icon + label) --')
  show('icon', bbox(im, 60, 238, 155, 266, TILE, 45))
  show('label', bbox(im, 40, 266, 175, 291, TILE, 45))
  show('label row2 (Group&Section)', bbox(im, 210, 328, 355, 353, TILE, 45))

  console.log(' -- dots --')
  show('active pill', bbox(im, 160, 216, 197, 234, PAGE_D, 20))
  show('inactive dot', bbox(im, 198, 216, 240, 234, PAGE_D, 20))

  console.log(' -- nav --')
  show('bar (whole)', bbox(im, 20, 741, 374, 815, PAGE_D, 20))
  show('active pill', bbox(im, 20, 741, 145, 815, C('#019477'), 40))
  show('nav icon home', bbox(im, 60, 750, 130, 782, C('#009577'), 60))
  show('nav label home', bbox(im, 45, 782, 145, 806, C('#009577'), 60))
  show('nav icon cards', bbox(im, 175, 750, 245, 782, NAVBG, 60))
  show('nav label cards', bbox(im, 160, 782, 260, 806, NAVBG, 60))
  console.log(`   nav bg sample @250,755 ${hex(im.at(250, 755))}  @320,800 ${hex(im.at(320, 800))}`)
  for (const dy of [0.5, 1, 2, 3, 4, 6, 8]) {
    const x = firstNear(im, 745 + dy, 24, 60, NAVBG, 40)
    const g = firstNear(im, 745 + dy, 24, 60, C('#019477'), 40)
    console.log(`   nav row y=${(745 + dy).toFixed(1)} first pill x=${g} first bg x=${x}`)
  }
}

await report('WhatsApp Image 2026-10-25 at 18.56.55 (1).jpeg', 'HOME dark EN slide1')
await report('WhatsApp Image 2026-10-25 at 18.18.55.jpeg', 'HOME light EN slide1')
