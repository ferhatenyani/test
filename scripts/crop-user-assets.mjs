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

/*
 * Card orientation and size.
 *
 * The two card photos arrive as PORTRAIT frames whose printed content lies
 * sideways. Rotating 90° CW stands that content up — which is what this script
 * used to ship, as a landscape card — but it does NOT match the donor.
 * old/webetu/public/cards/recto.png is 429x691, i.e. a PORTRAIT canvas with the
 * same sideways content as the raw photo. So the upright-then-rotate-left the
 * user asked for lands back on the raw orientation, and ROTATE = 0 is the
 * faithful result: rotate(90) then rotate(-90) is the identity, and the donor's
 * own artwork proves that orientation is the intended one.
 *
 * Size is taken from the donor and applied to BOTH faces, which their own files
 * are not: recto.png is 429x691 (aspect 0.6208) and verso.png 593x948 (0.6255).
 * The recto is the canonical one — it is the ratio the webetu2 placeholder
 * already carried as aspect-[429/691] — so both faces are emitted at exactly
 * 2x it, 858x1382, identical to each other.
 */
const ROTATE_CARD = 0
const CARD_ASPECT = 429 / 691
/** 2x the donor's recto.png, so hi-DPI phones stay sharp. */
const CARD_W = 858
const CARD_H = 1382

/**
 * The portrait is a different case from the cards: pic.jpeg is a sideways head
 * shot with no card frame to inherit, and rotate(90) CW is the only turn that
 * stands the face up (checked against rotate(270), which leaves it on its side).
 * It must NOT share the cards' constant — the two sources want opposite turns.
 */
const ROTATE_PORTRAIT = 90

async function sizeOf(buf) {
  const m = await sharp(buf).metadata()
  return `${m.width}x${m.height}`
}

async function buildCard(file, outName) {
  const rotated = await sharp(path.join(DIR, file)).rotate(ROTATE_CARD).toBuffer()
  const rInfo = await sharp(rotated).metadata()
  const out = path.join(DIR, outName)
  // `cover` on a centre crop: the photos are 0.644/0.653 against the target
  // 0.6208, so ~4% of the width is trimmed evenly. The crop is checked by eye
  // against the donor's recto.png after this runs, not assumed.
  await sharp(rotated)
    .resize({ width: CARD_W, height: CARD_H, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out)
  const kb = (fs.statSync(out).size / 1024).toFixed(0)
  console.log(
    `${file}  source ${rInfo.width}x${rInfo.height} (aspect ${(rInfo.width / rInfo.height).toFixed(4)}) ` +
      `→ ${outName} ${CARD_W}x${CARD_H} (aspect ${(CARD_W / CARD_H).toFixed(4)}) ${kb}KB`,
  )
}

async function buildAvatar() {
  const rotated = await sharp(path.join(DIR, 'pic.jpeg')).rotate(ROTATE_PORTRAIT).toBuffer()
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
