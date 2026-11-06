/**
 * Scratch: does the banner differ because of a vertical crop/offset, or because
 * the artwork itself is different? Tries small device-px shifts of the render
 * against the capture over a region and reports the best one as TEXT.
 */
import sharp from 'sharp'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const refs = JSON.parse(readFileSync(path.join(ROOT, 'qa/refs/home.json'), 'utf8'))
const THRESHOLD = 48

const load = async (f) => {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { d: data, w: info.width, h: info.height }
}

const [id, x0, y0, x1, y1] = process.argv.slice(2)
const sc = refs[id]
const A = await load(path.join(ROOT, 'qa/out', `${id}.png`))
const refRaw = await sharp(path.join(ROOT, 'screenshots', sc.capture)).rotate()
  .resize({ width: A.w, height: A.h, fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const Bm = { d: refRaw.data, w: refRaw.info.width, h: refRaw.info.height }
if (!Bm.d || Bm.d.length !== Bm.w * Bm.h * 4) throw new Error('reference buffer is not the expected raw RGBA')

const score = (dx, dy) => {
  let d = 0
  let n = 0
  for (let y = +y0; y < +y1; y++) {
    const yy = y + dy
    if (yy + 1 <= 0 || yy >= Bm.h) continue
    for (let x = +x0; x < +x1; x++) {
      const xx = x + dx
      if (xx + 1 <= 0 || xx >= Bm.w) continue
      const i = (y * A.w + x) * 4
      const j = (yy * Bm.w + xx) * 4
      n++
      const dd = Math.max(Math.abs(A.d[i] - Bm.d[j]), Math.abs(A.d[i + 1] - Bm.d[j + 1]), Math.abs(A.d[i + 2] - Bm.d[j + 2]))
      if (dd > THRESHOLD) d++
    }
  }
  return { pct: (d / n) * 100, n }
}

console.log(`${id} region dev x ${x0}..${x1} y ${y0}..${y1}  (css y ${(y0 / 1.5).toFixed(0)}..${(y1 / 1.5).toFixed(0)})`)
const rows = []
for (let dy = -10; dy <= 10; dy += 1) rows.push({ dy, dx: 0, ...score(0, dy) })
for (let dx = -6; dx <= 6; dx += 2) {
  const best = rows.reduce((a, b) => (b.pct < a.pct ? b : a))
  rows.push({ dy: best.dy, dx, ...score(dx, best.dy) })
}
rows.sort((a, b) => a.pct - b.pct)
for (const r of rows.slice(0, 8))
  console.log(`  dx${String(r.dx).padStart(3)} dy${String(r.dy).padStart(3)}  ${r.pct.toFixed(1)}%  (${r.n}px)`)
const zero = score(0, 0)
console.log(`  as-placed dx0 dy0: ${zero.pct.toFixed(1)}%`)
