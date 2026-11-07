/**
 * User-supplied photo pipeline.
 *
 * The three card/avatar images arrive as PHONE PHOTOS of physical documents: shot
 * in portrait, so the actual card is rotated 90° counter-clockwise inside the
 * frame. Both rotations were rendered and compared by eye — rotate(90) puts the
 * Arabic/Latin text and the portrait upright, rotate(270) leaves them on their
 * side — so ROTATE below is a verified constant, not a guess.
 *
 * Every crop is MEASURED and printed, not assumed: the card bounds come from
 * sharp's trim() against the photo's own background, and the avatar square is
 * derived from the rotated frame's dimensions.
 *
 * Run: npm run assets:user
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DIR = path.join(ROOT, 'public/assets')

const ROTATE = 90
/** Landscape ID-1 card ratio both faces are normalised to. */
const CARD_ASPECT = 1.585
/** ~4x the ~310 CSS px the card renders at, so hi-DPI phones stay sharp. */
const CARD_W = 1200

async function sizeOf(buf) {
  const m = await sharp(buf).metadata()
  return `${m.width}x${m.height}`
}

async function buildCard(file, outName) {
  const rotated = await sharp(path.join(DIR, file)).rotate(ROTATE).toBuffer()
  const rInfo = (await sharp(rotated).metadata())
  const trimmedBuf = await sharp(rotated).trim({ threshold: 12 }).toBuffer()
  const tInfo = await sharp(trimmedBuf).metadata()
  const wasted = 1 - (tInfo.width * tInfo.height) / (rInfo.width * rInfo.height)
  const out = path.join(DIR, outName)
  await sharp(trimmedBuf)
    .resize({ width: CARD_W, height: Math.round(CARD_W / CARD_ASPECT), fit: 'cover' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out)
  const kb = (fs.statSync(out).size / 1024).toFixed(0)
  console.log(
    `${file}  rotated ${rInfo.width}x${rInfo.height} → trim ${tInfo.width}x${tInfo.height} ` +
      `(${(wasted * 100).toFixed(1)}% was background) → ${outName} ${CARD_W}x${Math.round(CARD_W / CARD_ASPECT)} ${kb}KB`,
  )
}

async function buildAvatar() {
  const rotated = await sharp(path.join(DIR, 'pic.jpeg')).rotate(ROTATE).toBuffer()
  const { width, height } = await sharp(rotated).metadata()
  // A portrait ID photo puts the head in the upper half; a square crop anchored at
  // 42% of the surplus height keeps the face centred in a 48 CSS px circle without
  // clipping the hair, which a dead-centre crop does.
  const side = width
  const top = Math.round((height - side) * 0.42)
  const out = path.join(DIR, 'avatar.jpg')
  await sharp(rotated).extract({ left: 0, top, width: side, height: side }).resize(240, 240).jpeg({ quality: 82, mozjpeg: true }).toFile(out)
  console.log(`pic.jpeg  rotated ${width}x${height} → square ${side}@top=${top} → avatar.jpg 240x240 ${(fs.statSync(out).size / 1024).toFixed(0)}KB`)
}

async function compareLogoSources() {
  const crop = { left: 199, top: 516, width: 140, height: 64 }
  const buf = await sharp(path.join(DIR, 'loadingPage.jpeg')).rotate().extract(crop).toBuffer()
  const a = await sharp(buf).metadata()
  const b = await sharp(path.join(DIR, 'logo-progress.png')).metadata()
  console.log(
    `\nloadingPage.jpeg logo crop ${a.width}x${a.height} (aspect ${(a.width / a.height).toFixed(2)})   ` +
      `logo-progress.png ${b.width}x${b.height} (aspect ${(b.width / b.height).toFixed(2)})`,
  )

  // The two are the SAME wordmark; logo-progress.png is the real artwork at ~4x the
  // crop's resolution and carries alpha, so it is the source for the splash mark.
  // Trimming it to the ink box reproduces the crop's framing without the JPEG mush.
  const trimmedBuf = await sharp(path.join(DIR, 'logo-progress.png')).trim({ threshold: 8 }).toBuffer()
  const t = await sharp(trimmedBuf).metadata()
  const out = path.join(DIR, 'splash-logo.png')
  await sharp(trimmedBuf).png().toFile(out)
  console.log(
    `splash-logo.png ${t.width}x${t.height} (aspect ${(t.width / t.height).toFixed(2)}) trimmed from logo-progress.png ` +
      `— reference ink aspect ${(a.width / a.height).toFixed(2)}`,
  )
  // Reference geometry, CSS px (device / 1.5): box x 135.3..222.7, y 346.7..383.3 in
  // a 360x780 viewport — dead centre horizontally, cy at 46.8% of the height.
  console.log('reference: bg #e0e0e0, logo cx 180/360, cy 365/780 (46.8% of height)')
}

async function main() {
  await buildCard('etudiant.jpeg', 'card-recto.jpg')
  await buildCard('resident.jpeg', 'card-verso.jpg')
  await buildAvatar()
  await compareLogoSources()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
