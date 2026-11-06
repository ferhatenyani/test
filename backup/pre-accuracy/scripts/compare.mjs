/**
 * Builds clean side-by-side pairs (reference left, current render right) using
 * SVG compositing. The earlier raw-pixel blit mis-handled channel stride and
 * produced noise, so pairs are built here where the approach is provably right.
 *   node scripts/compare.mjs
 */
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'qa/out')
const CMP = path.join(ROOT, 'qa/compare')
const SHOTS = path.join(ROOT, 'screenshots')
mkdirSync(CMP, { recursive: true })

const H = 940
const GAP = 14

const PAIRS = {
  // 18.18.55 is the HOME capture, not login — login references are the 18.25.5x set.
  '01-login-en-light': 'WhatsApp Image 2026-10-25 at 18.25.55.jpeg',
  '04-login-ar-light': 'WhatsApp Image 2026-10-25 at 18.25.56 (2).jpeg',
  '05-login-ar-dark': 'WhatsApp Image 2026-10-25 at 18.25.56 (3).jpeg',
  '06-login-en-dark': 'WhatsApp Image 2026-10-25 at 18.22.04.jpeg',
  '07-verify-en-light': 'WhatsApp Image 2026-10-25 at 18.35.12.jpeg',
  '09-home-en-light': 'WhatsApp Image 2026-10-25 at 18.18.55.jpeg',
  '10-home-en-light-banner2': 'WhatsApp Image 2026-10-25 at 18.26.15.jpeg',
  '12-home-en-dark': 'WhatsApp Image 2026-10-25 at 18.26.14 (1).jpeg',
  '16-profile-en-light': 'WhatsApp Image 2026-10-25 at 18.34.09.jpeg',
  '19-service-sadbox': 'WhatsApp Image 2026-10-25 at 18.26.05 (1).jpeg',
  '20-service-calx': 'WhatsApp Image 2026-10-25 at 18.26.05 (2).jpeg',
  '22-service-chips': 'WhatsApp Image 2026-10-25 at 18.26.06 (1).jpeg',
}

let made = 0
for (const [name, ref] of Object.entries(PAIRS)) {
  const mine = path.join(OUT, `${name}.png`)
  const theirs = path.join(SHOTS, ref)
  if (!existsSync(mine) || !existsSync(theirs)) continue

  const a = await sharp(theirs, { failOn: 'none' })
    .resize({ height: H, fit: 'inside' })
    .png()
    .toBuffer()
  const b = await sharp(mine, { failOn: 'none' })
    .resize({ height: H, fit: 'inside' })
    .png()
    .toBuffer()

  const am = await sharp(a).metadata()
  const bm = await sharp(b).metadata()
  const W = am.width + bm.width + GAP * 3

  const svg = [
    `<svg width="${W}" height="${H + 30}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="100%" height="100%" fill="#101216"/>`,
    `<text x="${GAP}" y="18" fill="#8fd3c0" font-family="monospace" font-size="13">REFERENCE ${ref.slice(-18)}</text>`,
    `<text x="${GAP * 2 + am.width}" y="18" fill="#e8c07a" font-family="monospace" font-size="13">CURRENT ${name}</text>`,
    `<image x="${GAP}" y="26" width="${am.width}" height="${am.height}" href="data:image/png;base64,${a.toString('base64')}"/>`,
    `<image x="${GAP * 2 + am.width}" y="26" width="${bm.width}" height="${bm.height}" href="data:image/png;base64,${b.toString('base64')}"/>`,
    `</svg>`,
  ].join('')

  await sharp(Buffer.from(svg)).png().toFile(path.join(CMP, `${name}.png`))
  made++
}
console.log(`compare pairs -> ${CMP} (${made})`)
