/**
 * Scratch: per-band pixel-diff report for a home scenario, so the worst rows
 * can be found as TEXT instead of reading the diff image. Mirrors pixdiff.mjs's
 * threshold and mask handling.
 */
import sharp from 'sharp'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const THRESHOLD = 48
const refs = JSON.parse(readFileSync(path.join(ROOT, 'qa/refs/home.json'), 'utf8'))
const MASK = { a394: [[0, 41], [1243, 1280]] }
const BAND = 64

for (const id of process.argv.slice(2)) {
  const sc = refs[id]
  const A = await sharp(path.join(ROOT, 'qa/out', `${id}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const b0 = sharp(path.join(ROOT, 'screenshots', sc.capture)).rotate()
  const W = A.info.width
  const H = A.info.height
  const refBuf = await b0.clone().resize({ width: W, height: H, fit: 'fill' }).ensureAlpha().raw().toBuffer()
  const mask = sc.mask || MASK[sc.profile] || []
  console.log(`\n=== ${id}  ${W}x${H} device`)
  for (let y0 = 0; y0 < H; y0 += BAND) {
    const y1 = Math.min(H, y0 + BAND)
    let d = 0
    let n = 0
    for (let y = y0; y < y1; y++) {
      if (mask.some(([s, e]) => y >= s && y < e)) continue
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4
        n++
        const dd = Math.max(
          Math.abs(A.data[i] - refBuf[i]),
          Math.abs(A.data[i + 1] - refBuf[i + 1]),
          Math.abs(A.data[i + 2] - refBuf[i + 2]),
        )
        if (dd > THRESHOLD) d++
      }
    }
    if (!n) continue
    console.log(`  dev ${String(y0).padStart(4)}-${String(y1).padStart(4)}  css y~${(y0 / 1.5).toFixed(0).padStart(3)}  ${((d / n) * 100).toFixed(1).padStart(5)}%`)
  }
}
