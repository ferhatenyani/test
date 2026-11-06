/**
 * asset-ink.mjs — ink bbox + alpha stats for the empty-state artwork asset, so
 * the <img> element box can be recovered from the ink box measured in a capture.
 * Scratch tooling for the `service` agent.
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const file = process.argv[2] || 'public/assets/empty-sad-box.png'
const { data, info } = await sharp(path.join(ROOT, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, C = info.channels
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2], data[i + 3]] }

console.log(`${file}  ${W}x${H}  aspect ${(W / H).toFixed(4)}`)
console.log(`  corners  TL ${px(0, 0)}  TR ${px(W - 1, 0)}  BL ${px(0, H - 1)}  BR ${px(W - 1, H - 1)}  mid ${px(W >> 1, H >> 1)}`)

const hist = {}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const v = px(x, y)[3]
  const k = v === 0 ? 'a=0' : v === 255 ? 'a=255' : v < 10 ? 'a 1-9' : v < 40 ? 'a 10-39' : 'a 40-254'
  hist[k] = (hist[k] || 0) + 1
}
console.log('  alpha histogram', hist)

for (const t of [1, 10, 40, 128, 200]) {
  let lx = 1e9, rx = -1, ty = 1e9, by = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (px(x, y)[3] > t) { if (x < lx) lx = x; if (x > rx) rx = x; if (y < ty) ty = y; if (y > by) by = y }
  }
  if (rx < 0) { console.log(`  alpha>${t}: none`); continue }
  const w = rx - lx + 1, h = by - ty + 1
  console.log(`  alpha>${String(t).padStart(3)}  x ${lx}..${rx} y ${ty}..${by}  w ${w} h ${h}  aspect ${(w / h).toFixed(4)}`
    + `  margins L${lx} T${ty} R${W - 1 - rx} B${H - 1 - by}`
    + `  frac L${(lx / W).toFixed(4)} T${(ty / H).toFixed(4)} R${((W - 1 - rx) / W).toFixed(4)} B${((H - 1 - by) / H).toFixed(4)}`)
}
