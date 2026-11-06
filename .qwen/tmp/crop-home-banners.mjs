/**
 * Throwaway: re-crop the home banner artwork from the a394 home captures at the
 * box measured off the pixels (x 24..370, y 111..212.5 CSS = 519x152 device),
 * so the asset's own aspect equals the reference box and no object-cover
 * cropping is needed. Rects are documented in qa/requests/home.md so the
 * canonical scripts/crop-assets.mjs manifest can be updated centrally.
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = 'C:/Users/MyHomehP/Desktop/work/webetu2'
const SHOTS = path.join(ROOT, 'screenshots')
const OUT = path.join(ROOT, 'public/assets')
const S = 591 / 394
// Banner box in CSS px, transcribed from the captures with scripts/qa/pxprobe.mjs.
const BOX = { x: 24, y: 111, w: 346, h: 101.5 }

const JOBS = [
  // slide 1 is the same artwork in EN and AR (verified on the contact sheet)
  ['WhatsApp Image 2026-10-25 at 18.56.55 (1).jpeg', 'banner-1-studentcamp.png'],
  // slide 2 EN: light capture, whose card is the canonical #019477
  // (the dark EN capture 18.56.55 shows #1bb495 — the outlier, see report)
  ['WhatsApp Image 2026-10-25 at 18.22.04.jpeg', 'banner-2-matricule.png'],
  // slide 2 AR: mirrored layout + Arabic university name, needs its own artwork
  ['WhatsApp Image 2026-10-25 at 18.56.18.jpeg', 'banner-2-matricule-ar.png'],
]

for (const [src, out] of JOBS) {
  const region = {
    left: Math.round(BOX.x * S),
    top: Math.round(BOX.y * S),
    width: Math.round(BOX.w * S),
    height: Math.round(BOX.h * S),
  }
  const info = await sharp(path.join(SHOTS, src)).rotate().extract(region).png().toFile(path.join(OUT, out))
  console.log(`${out.padEnd(28)} ${info.width}x${info.height}  aspect ${(info.width / info.height).toFixed(3)}  <- ${src.slice(-18)}`)
}
console.log(`target box ${BOX.w}x${BOX.h} CSS, aspect ${(BOX.w / BOX.h).toFixed(3)}`)
