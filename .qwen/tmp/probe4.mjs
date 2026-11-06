// login-refs probe: one compact table of every login geometry number for a capture.
// node probe4.mjs <capture-name-or-path>
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'

const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const a = process.argv[2]
const src = fs.existsSync(a) ? a : path.join(SHOTS, a)
const img = await sharp(src).rotate()
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, CH = info.channels
const S = W === 540 ? 1.5 : 591 / 394
const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
const D = (p, q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]))
const hx = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const K = (n) => +(n / S).toFixed(1)
const rgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
const lum = (p) => (p[0] + p[1] + p[2]) / 3

console.log(`=== ${path.basename(src)}  ${W}x${H} dev = ${K(W)}x${K(H)} css`)

function bboxOf(pred, win) {
  const [x0, y0, x1, y1] = win
  let a = 1e9, b = 1e9, c = -1, e = -1, n = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pred(at(x, y))) { n++; a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, y); e = Math.max(e, y) }
  return n ? { x0: a, x1: c, y0: b, y1: e, n } : null
}
const show = (label, r) => console.log(r ? `${label.padEnd(16)} x ${K(r.x0)}..${K(r.x1)} (w ${K(r.x1 - r.x0 + 1)})  y ${K(r.y0)}..${K(r.y1)} (h ${K(r.y1 - r.y0 + 1)})  n=${r.n}` : `${label.padEnd(16)} none`)

const isGreen = (p) => D(p, rgb('009577')) < 52 && p[1] > p[0] + 25
const isWhite = (p) => Math.min(p[0], p[1], p[2]) > 235
const isInk = (p) => lum(p) < 150
const isLite = (p) => lum(p) > 190

// band: green in the top 220 device rows only (button is lower)
show('band', bboxOf(isGreen, [0, 0, W - 1, 260]))
// band corner radius: bottom edge y as a function of x, left half
{
  const r = bboxOf(isGreen, [0, 0, W - 1, 260])
  if (r) {
    const flat = r.y1
    const prof = []
    for (let x = 0; x <= flat; x += 3) {
      let y = flat
      while (y > 0 && !isGreen(at(x, y))) y--
      prof.push(`${K(x)}:${K(y)}`)
    }
    console.log(`  band corner (cssX:cssY) ${prof.join(' ')}`)
  }
}
// logo card = white blob inside the band region
show('logoCard', bboxOf(isWhite, [0, 60, W - 1, 420]))
// title ink (between logo card bottom and underline)
{
  const card = bboxOf(isWhite, [0, 60, W - 1, 420])
  const y0 = card ? card.y1 + 4 : 360
  show('titleInk', bboxOf(isInk, [0, y0, W - 1, y0 + 120]))
  const u = bboxOf(isGreen, [0, y0 + 60, W - 1, y0 + 200])
  show('underline', u)
  const fc = bboxOf(isWhite, [20, y0 + 100, W - 20, H - 1])
  if (fc) console.log(`  formCard       x ${K(fc.x0)}..${K(fc.x1)} (w ${K(fc.x1 - fc.x0 + 1)})  y ${K(fc.y0)}..${K(fc.y1)} (h ${K(fc.y1 - fc.y0 + 1)})`)
}
// pills: rows where >20% of the row is the field fill
{
  const fill = bboxOf(isWhite, [20, 400, W - 20, H - 1])
  if (fill) {
    const t = rgb('e8eaee'), td = rgb('2a2e3a')
    for (const [name, c, tol] of [['pillFillLight', t, 16], ['pillFillDark', td, 12]]) {
      const rows = []
      for (let y = fill.y0; y <= fill.y1; y++) { let n = 0; for (let x = 0; x < W; x++) if (D(at(x, y), c) <= tol) n++; if (n > W * 0.2) rows.push(y) }
      const bands = []
      for (const y of rows) { const l = bands.at(-1); if (l && y - l[1] <= 4) l[1] = y; else bands.push([y, y]) }
      for (const [s, e] of bands.entries()) {
        const bb = bboxOf((p) => D(p, c) <= tol, [0, bands[s][0], W - 1, bands[s][1]])
        show(`  ${name}${s}`, bb)
        // border colour: darkest pixel on the ring of the box
        let dk = null, dl = 999, lt = null, ll = -1
        for (let x = bb.x0 - 3; x <= bb.x1 + 3; x++) for (const y of [bb.y0 - 3, bb.y1 + 3]) {
          if (y < 0 || y >= H || x < 0 || x >= W) continue
          const p = at(x, y); if (lum(p) < dl) { dl = lum(p); dk = p }; if (lum(p) > ll) { ll = lum(p); lt = p }
        }
        console.log(`    border darkest ${hx(dk)}  lightest ${hx(lt)}`)
      }
    }
  }
}
// labels: ink runs inside the form card above each pill
{
  const fc = bboxOf(isWhite, [20, 400, W - 20, H - 1])
  if (fc) {
    const rows = []
    for (let y = fc.y0; y <= fc.y1; y++) { let n = 0; for (let x = fc.x0; x <= fc.x1; x++) if (isInk(at(x, y))) n++; if (n > 6) rows.push([y, n]) }
    const bands = []
    for (const [y, n] of rows) { const l = bands.at(-1); if (l && y - l[1] <= 5) { l[1] = y; l[2] = Math.max(l[2], n) } else bands.push([y, y, n]) }
    bands.forEach(([s, e, pk], i) => {
      const bb = bboxOf(isInk, [fc.x0, s, fc.x1, e])
      console.log(`  labelInk${i}      x ${K(bb.x0)}..${K(bb.x1)} (w ${K(bb.x1 - bb.x0 + 1)})  y ${K(s)}..${K(e)} (h ${K(e - s + 1)}) peak ${pk}px`)
      // sample the darkest glyph pixel colour
      let best = null, bl = 999
      for (let y = s; y <= e; y++) for (let x = bb.x0; x <= bb.x1; x++) { const p = at(x, y); if (lum(p) < bl) { bl = lum(p); best = p } }
      console.log(`    darkest ${hx(best)}`)
    })
  }
}
// button: green blob below the form card top
show('button', bboxOf(isGreen, [0, 700, W - 1, 1000]))
{
  const bb = bboxOf(isGreen, [0, 700, W - 1, 1000])
  if (bb) {
    const mid = (bb.y0 + bb.y1) >> 1
    let best = null, bl = 1e9
    for (let y = bb.y0 + 2; y < bb.y1 - 2; y++) for (let x = bb.x0 + 2; x < bb.x0 + 30; x++) { const p = at(x, y); if (lum(p) < bl) { bl = lum(p); best = p } }
    console.log(`  button colour (most common dark-green) ~${hx(best)}`)
    // corner radius from left edge profile
    const prof = []
    for (let dy = 0; dy <= (bb.y1 - bb.y0) / 2; dy += 3) {
      let x = bb.x0
      while (x < W && !isGreen(at(x, bb.y0 + dy))) x++
      prof.push(`${K(dy)}:${K(x)}`)
    }
    console.log(`  button corner (cssDy:cssX) ${prof.join(' ')}`)
  }
}
// footer ink
{
  const rows = []
  for (let y = 1000; y < 1140; y++) { let n = 0; for (let x = 0; x < W; x++) if (D(at(x, y), rgb('009577')) < 60) n++; if (n) rows.push(y) }
  const bb = bboxOf(isInk, [100, 1000, W - 100, 1140])
  show('footerInk', bb)
  const lw = bboxOf((p) => lum(p) > 170 && lum(p) < 235, [100, 1000, W - 100, 1140])
  show('footerInkLite', lw)
}
