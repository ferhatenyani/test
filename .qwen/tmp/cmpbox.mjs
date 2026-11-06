/**
 * Scratch helper for the home accuracy pass (not app code, not a harness file).
 * Runs the SAME measurement that scripts/qa/pxprobe.mjs does on a reference
 * capture and on the matching qa/out/<id>.png render, side by side, so a glyph
 * size, text baseline or corner edge is compared with an identical call.
 *
 *   node .qwen/tmp/cmpbox.mjs <renderId> <captureFile> spec...
 *
 * spec forms:
 *   b<bgHex>:<x0>,<y0>,<x1>,<y1>,<min>     tight ink box vs that background
 *   r<y>:<x0>,<x1>,<min>                   scanline colour transitions
 *   c<x>:<y0>,<y1>,<min>                   vertical colour transitions
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const CSSW = 394

const load = async (f) => {
  const { data, info } = await sharp(f).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { d: data, w: info.width, ch: info.channels, S: info.width / CSSW }
}
const px = (im, x, y) => {
  const X = Math.round(x * im.S)
  const Y = Math.round(y * im.S)
  if (X < 0 || Y < 0 || X + 1 > im.w) return null
  const i = (Y * im.w + X) * im.ch
  return { r: im.d[i], g: im.d[i + 1], b: im.d[i + 2] }
}
const dd = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')
const r1 = (v) => +v.toFixed(1)

function bbox(im, x0, y0, x1, y1, bg, min) {
  const B = { r: parseInt(bg.slice(0, 2), 16), g: parseInt(bg.slice(2, 4), 16), b: parseInt(bg.slice(4, 6), 16) }
  let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity, n = 0
  for (let y = y0; y <= y1; y += 0.5)
    for (let x = x0; x <= x1; x += 0.5) {
      const q = px(im, x, y)
      if (q && dd(q, B) > min) {
        n++
        if (x < ax) ax = x
        if (x > bx) bx = x
        if (y < ay) ay = y
        if (y > by) by = y
      }
    }
  if (!n) return 'none'
  return `x ${r1(ax)}..${r1(bx)} w${r1(bx - ax)}  y ${r1(ay)}..${r1(by)} h${r1(by - ay)}  cx${r1((ax + bx) / 2)} cy${r1((ay + by) / 2)}  ${n}px`
}

function line(im, fixed, lo, hi, vertical, min) {
  const out = []
  let prev = null
  for (let v = lo; v <= hi; v += 0.5) {
    const c = px(im, vertical ? fixed : v, vertical ? v : fixed)
    if (!c) continue
    if (prev === null || dd(c, prev) > min) {
      out.push(`${r1(v)} ${hex(c)}`)
      prev = c
    }
  }
  return out.join('  ')
}

const [id, capture, ...specs] = process.argv.slice(2)
if (!id || !capture) {
  console.error('usage: node .qwen/tmp/cmpbox.mjs <renderId> <capture> spec...')
  process.exit(1)
}
const REF = await load(path.join(ROOT, 'screenshots', capture))
const REN = await load(path.join(ROOT, 'qa/out', `${id}.png`))

for (const spec of specs) {
  const [head, body] = spec.split(':')
  const a = body.split(',').map(Number)
  const kind = head[0]
  let ref, ren
  if (kind === 'r') {
    ref = line(REF, a[0], a[1], a[2], false, a[3])
    ren = line(REN, a[0], a[1], a[2], false, a[3])
  } else if (kind === 'c') {
    ref = line(REF, a[0], a[1], a[2], true, a[3])
    ren = line(REN, a[0], a[1], a[2], true, a[3])
  } else {
    const bg = head.slice(1)
    ref = bbox(REF, a[0], a[1], a[2], a[3], bg, a[4])
    ren = bbox(REN, a[0], a[1], a[2], a[3], bg, a[4])
  }
  console.log(`--- ${spec}`)
  console.log(`  REF ${ref}`)
  console.log(`  REN ${ren}`)
}
