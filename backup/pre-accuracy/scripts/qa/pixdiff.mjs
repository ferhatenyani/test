/**
 * Step 3 of the accuracy harness: masked pixel diff against the reference.
 *
 * This is a smoke test and a trend number, not the gate — font hinting, JPEG
 * artifacts and the OS status bar mean 0% is unreachable. The gate is
 * check.mjs's measured deltas; this catches the mistakes nobody thought to
 * write an assertion for.
 *
 * Rows listed in `mask` are excluded from the diff (OS chrome, keyboards) and
 * painted grey in the report image.
 *
 *   node scripts/qa/pixdiff.mjs            # every scenario with a capture
 *   node scripts/qa/pixdiff.mjs 01-login
 *
 * Writes qa/diff/<id>.png (reference | render | diff heatmap) and a summary.
 */
import sharp from 'sharp'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { QA, OUT, SHOTS, DIFF, DEFAULT_MASK, loadRefs, scenarios } from './lib.mjs'

mkdirSync(DIFF, { recursive: true })

const THRESHOLD = 48 // max-channel delta; absorbs WhatsApp JPEG ringing

const refs = loadRefs()
const rows = []

for (const [id, sc] of scenarios(refs)) {
  if (!sc.capture) continue
  const render = path.join(OUT, `${id}.png`)
  const ref = path.join(SHOTS, sc.capture)
  if (!existsSync(render)) { rows.push({ id, err: 'not rendered — run measure.mjs' }); continue }
  if (!existsSync(ref)) { rows.push({ id, err: `missing capture ${sc.capture}` }); continue }

  const a0 = await sharp(render)
  const b0 = await sharp(ref).rotate()
  const am = await a0.clone().metadata()
  const bm = await b0.clone().metadata()

  // Put the reference on the render's pixel grid (they should already match).
  const W = am.width
  const H = am.height
  const refScaled = await b0.clone().resize({ width: W, height: H, fit: 'fill' }).png().toBuffer()

  const [A, B] = await Promise.all([
    a0.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(refScaled).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  // A bad buffer shape must fail loudly: an all-NaN pass once reported 0.00%
  // differing, which is indistinguishable from a pixel-perfect page.
  for (const [label, r] of [['render', A], ['reference', B]]) {
    if (r.info.width !== W || r.info.height !== H)
      throw new Error(`${id}: ${label} is ${r.info.width}x${r.info.height}, expected ${W}x${H}`)
    if (r.info.channels !== 4) throw new Error(`${id}: ${label} has ${r.info.channels} channels, expected 4`)
    if (r.data.length !== W * H * 4) throw new Error(`${id}: ${label} buffer is ${r.data.length} bytes, expected ${W * H * 4}`)
  }
  const px = A.data
  const rf = B.data

  const mask = sc.mask || DEFAULT_MASK[sc.profile] || []
  // Mask bands are in device pixels; `y` already is a device-pixel row.
  const masked = (y) => mask.some(([s, e]) => y >= s && y < e)

  let diff = 0
  let compared = 0
  let sum = 0
  const heat = Buffer.alloc(W * H * 3)
  for (let y = 0; y < H; y++) {
    const skip = masked(y)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const o = (y * W + x) * 3
      const d = Math.max(
        Math.abs(px[i] - rf[i]),
        Math.abs(px[i + 1] - rf[i + 1]),
        Math.abs(px[i + 2] - rf[i + 2]),
      )
      if (skip) {
        heat[o] = 40; heat[o + 1] = 40; heat[o + 2] = 50
        continue
      }
      compared++
      sum += d
      if (d > THRESHOLD) { diff++; heat[o] = 255; heat[o + 1] = 40; heat[o + 2] = 90 }
      else { heat[o] = 12; heat[o + 1] = 12; heat[o + 2] = 16; heat[o + 3] = 0 }
    }
  }

  const pct = compared ? (diff / compared) * 100 : 100
  const mean = compared ? sum / compared : 0
  if (!compared) throw new Error(`${id}: mask covered every row — nothing was compared`)
  if (!Number.isFinite(mean)) throw new Error(`${id}: mean delta is not finite — buffer comparison is broken`)
  rows.push({ id, pct, mean, compared, W, H, capture: sc.capture })

  const strip = await Promise.all([
    sharp(render).resize({ width: W, height: H }).png().toBuffer(),
    sharp(refScaled).png().toBuffer(),
    sharp(heat, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer(),
  ])
  const GAP = 10
  const CW = W * 3 + GAP * 2
  const svg = `<svg width="${CW}" height="${H + 24}" xmlns="http://www.w3.org/2000/svg">
<rect width="100%" height="100%" fill="#0b0d10"/>
<text x="4" y="16" fill="#e8c07a" font-family="monospace" font-size="13">RENDER ${id}</text>
<text x="${W + GAP + 4}" y="16" fill="#7ee0c0" font-family="monospace" font-size="13">REFERENCE ${sc.capture.slice(-18)}</text>
<text x="${(W + GAP) * 2 + 4}" y="16" fill="#ff5570" font-family="monospace" font-size="13">DIFF ${pct.toFixed(2)}%</text>
${strip.map((b, i) => `<image x="${i * (W + GAP)}" y="24" width="${W}" height="${H}" href="data:image/png;base64,${b.toString('base64')}"/>`).join('')}
</svg>`
  await sharp(Buffer.from(svg)).png().toFile(path.join(DIFF, `${id}.png`))
}

const bad = rows.filter((r) => r.err)
const ok = rows.filter((r) => !r.err).sort((a, b) => b.pct - a.pct)
for (const r of ok)
  console.log(`${r.id.padEnd(30)} ${String(r.pct.toFixed(2) + '%').padStart(7)} differing  meanΔ${r.mean.toFixed(1).padStart(5)}  ${r.W}x${r.H}`)
for (const r of bad) console.log(`${r.id.padEnd(30)} ERROR ${r.err}`)
if (ok.length) {
  const avg = ok.reduce((s, r) => s + r.pct, 0) / ok.length
  console.log(`\n${ok.length} compared · mean ${avg.toFixed(2)}% differing · worst ${ok[0].id} · threshold Δ>${THRESHOLD}/channel`)
}
if (bad.length) process.exit(1)
