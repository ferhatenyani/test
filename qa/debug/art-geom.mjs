/**
 * art-geom.mjs — recover the <img> ELEMENT box of the sad-box illustration from a
 * capture by anchoring on the DARK BOX, not the whole ink.
 *
 * The asset (public/assets/empty-sad-box.png) is fully opaque with the page
 * background #f5f6f8 baked into its margins, so an element edge is invisible in a
 * capture. Faint props (shelf, plant) also sit within a few RGB steps of that
 * background and drop under a JPEG-safe threshold, so "whole ink bbox" gives a
 * different aspect in the asset than in the capture (0.917 vs 1.037) and cannot be
 * divided out. The teal box is high contrast in both, so its bbox fixes both the
 * render scale and the element origin exactly.
 *
 *   node qa/debug/art-geom.mjs
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SHOTS = path.join(ROOT, 'screenshots')
const SCALE = 1.5
const BG = [245, 246, 248]
const css = (dev) => Math.round((dev / SCALE) * 100) / 100
const r1 = (v) => Math.round(v * 10) / 10
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))

async function raw(file) {
  const { data, info } = await sharp(file).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = info.channels
  return { W, H, at: (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]] } }
}
function inkBox(img, x0, y0, x1, y1, pred) {
  let lx = 1e9, rx = -1, ty = 1e9, by = -1
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!pred(img.at(x, y))) continue
    if (x < lx) lx = x; if (x > rx) rx = x; if (y < ty) ty = y; if (y > by) by = y
  }
  return rx < 0 ? null : { lx, rx, ty, by }
}

const DARK = (c) => dist(c, BG) > 90

const asset = await raw(path.join(ROOT, 'public/assets/empty-sad-box.png'))
const ad = inkBox(asset, 0, 0, asset.W - 1, asset.H - 1, DARK)
const aw = ad.rx - ad.lx + 1, ah = ad.by - ad.ty + 1
console.log(`asset ${asset.W}x${asset.H} (aspect ${(asset.W / asset.H).toFixed(4)})`)
console.log(`  dark box  x ${ad.lx}..${ad.rx} y ${ad.ty}..${ad.by}  w ${aw} h ${ah} (aspect ${(aw / ah).toFixed(4)})`)
console.log(`  offset within element: x/W ${(ad.lx / asset.W).toFixed(4)}  y/H ${(ad.ty / asset.H).toFixed(4)}`)

const CAPS = [
  ['18.26.05', 96, 436], ['18.26.05 (1)', 96, 436], ['18.26.06', 96, 436],
  ['18.26.06 (1)', 96, 458], ['18.26.06 (4)', 150, 436],
]
for (const [name, cy0, cy1] of CAPS) {
  const img = await raw(path.join(SHOTS, `WhatsApp Image 2026-10-25 at ${name}.jpeg`))
  const b = inkBox(img, 0, Math.round(cy0 * SCALE), img.W - 1, Math.round(cy1 * SCALE), DARK)
  if (!b) { console.log(`\n${name}: no dark box`); continue }
  const dw = css(b.rx - b.lx + 1), dh = css(b.by - b.ty + 1)
  const s = dw / aw                      // rendered CSS px per asset px
  const elW = asset.W * s
  const elH = asset.H * s
  const elX = css(b.lx) - ad.lx * s
  const elY = css(b.ty) - ad.ty * s
  console.log(`\n${name}   dark box CSS x ${css(b.lx)}..${css(b.rx)} (w ${dw})  y ${css(b.ty)}..${css(b.by)} (h ${dh})  aspect ${(dw / dh).toFixed(4)}`)
  console.log(`  scale ${s.toFixed(4)} css/assetpx  ->  ELEMENT  x ${r1(elX)} y ${r1(elY)} w ${r1(elW)} h ${r1(elH)}  cx ${r1(elX + elW / 2)}  aspect ${(elW / elH).toFixed(4)}`)
  console.log(`  element top below the band (band bottom = 91.7 capture CSS): ${r1(elY - 91.7)}   app-y (−25 status bar): ${r1(elY - 25)}`)
}
