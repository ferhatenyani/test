/**
 * Phase 1 asset pipeline.
 *
 * Source chosen per asset by which is actually higher fidelity:
 *   copy  - the donor project ships this artwork as a high-res alpha PNG
 *   crop  - artwork unique to this app: measured crop from the reference capture
 *
 * Small monochrome UI chrome (field icons, chevrons, profile row glyphs, the
 * calendar-x and the two tile glyphs the donor lacks) is NOT cropped: a ~20px
 * region of a 591px-wide JPEG is mush, and those marks must recolour with the
 * theme. They are inline SVG in src/components/icons.jsx instead.
 *
 * Rects are measured against qa/debug/home-grid.png, not guessed.
 */
import sharp from 'sharp'
import { mkdirSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SHOTS = path.join(ROOT, 'screenshots')
const DONOR = 'C:/Users/MyHomehP/Desktop/work/old/webetu'
const OUT = path.join(ROOT, 'public/assets')
const ICONS = path.join(ROOT, 'public/icons')

const S = (f) => path.join(SHOTS, f)
const D = (f) => path.join(DONOR, f)

const HOME = S('WhatsApp Image 2026-10-25 at 18.26.15.jpeg')
const HOME1 = S('WhatsApp Image 2026-10-25 at 18.26.14 (1).jpeg')
const SADBOX_SRC = S('WhatsApp Image 2026-10-25 at 18.26.05 (1).jpeg')

// Banner card on the home screen: y13->y25, x7.5->x93 on the 591x1280 grid.
const BANNER = { left: 0.075, top: 0.128, right: 0.93, bottom: 0.252 }
// Full illustration incl. the faint shelf + plant, above the caption line.
const SADBOX = { left: 0.08, top: 0.22, right: 0.92, bottom: 0.57 }

/*
 * Mapped by the SHAPE the reference grid shows, not by the donor filename: the
 * donor names describe the donor's own app. Verified against
 * qa/debug/home-grid.png -> Percentage=pie, Transcripts=folder,
 * Debts=calculator, Academic vacation=document.
 * absences + onou have no donor source and are inline SVG (see icons.jsx):
 * their only reference is a ~20px region of a 591px-wide JPEG.
 */
const TILES = [
  ['discharge', 'discharge-icon'],
  ['timetable', 'timetable-icon'],
  ['group-section', 'group-section-icon'],
  ['exams-schedule', 'exams-schedule-icon'],
  ['exam-grades', 'exam-grades-icon'],
  ['assessment', 'assessment-icon'],
  ['percentage', 'academic-transcripts-icon'],
  ['academic-transcripts', 'percentage-icon'],
  ['debts', 'academic-vacation-icon'],
  ['academic-vacation', 'debts-icon'],
  ['enrollments', 'enrollments-icon'],
  ['other-services', 'other-services-icon'],
]

const MANIFEST = [
  { out: 'logo-progress.png', kind: 'keybg', src: D('src/assets/progres-full-logo.png') },
  { out: 'avatar.png', kind: 'copy', src: D('public/assets/profile-photo.png') },
  { out: 'nav/home.png', kind: 'copy', src: D('public/assets/home-icon.png') },
  { out: 'nav/cards.png', kind: 'copy', src: D('public/assets/cards-icon.png') },
  { out: 'nav/profile.png', kind: 'copy', src: D('public/assets/profile-icon.png') },
  ...TILES.map(([slug, donorFile]) => ({
    out: `tiles/${slug}.png`,
    kind: 'copy',
    src: D(`public/assets/${donorFile}.png`),
  })),
  { out: 'banner-1-studentcamp.png', kind: 'crop', src: HOME1, rect: BANNER },
  { out: 'banner-2-matricule.png', kind: 'crop', src: HOME, rect: BANNER },
  { out: 'empty-sad-box.png', kind: 'crop', src: SADBOX_SRC, rect: SADBOX, scale: 1.5 },
]

/**
 * The donor logo ships fully opaque with a grey plate baked in, which reads as a
 * rectangle on the white/dark card. Key that plate out against the sampled
 * corner colour, with a soft ramp so anti-aliased glyph edges survive.
 */
async function keyBackground(entry, target) {
  const { data, info } = await sharp(entry.src, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const px = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  const ch = info.channels
  const corners = [
    [1, 1],
    [info.width - 2, 1],
    [1, info.height - 2],
    [info.width - 2, info.height - 2],
  ]
  let br = 0
  let bg = 0
  let bb = 0
  for (const [x, y] of corners) {
    const i = (y * info.width + x) * ch
    br += px[i]
    bg += px[i + 1]
    bb += px[i + 2]
  }
  br /= 4
  bg /= 4
  bb /= 4

  const TOL = 40
  for (let i = 0; i < px.length; i += ch) {
    const d = Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb)
    if (d < TOL) px[i + 3] = 0
    else if (d < TOL * 2) px[i + 3] = Math.round((255 * (d - TOL)) / TOL)
  }

  await sharp(px, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toFile(target)
}

const made = []
const failed = []

for (const entry of MANIFEST) {
  const target = path.join(OUT, entry.out)
  try {
    mkdirSync(path.dirname(target), { recursive: true })
    if (entry.kind === 'copy') {
      if (!existsSync(entry.src)) throw new Error(`missing donor file ${entry.src}`)
      await sharp(entry.src, { failOn: 'none' }).png().toFile(target)
    } else if (entry.kind === 'keybg') {
      await keyBackground(entry, target)
    } else {
      const src = sharp(entry.src, { failOn: 'none' })
      const { width, height } = await src.metadata()
      const l = Math.round(entry.rect.left * width)
      const t = Math.round(entry.rect.top * height)
      const w = Math.round((entry.rect.right - entry.rect.left) * width)
      const h = Math.round((entry.rect.bottom - entry.rect.top) * height)
      await src
        .extract({ left: l, top: t, width: w, height: h })
        .resize({ width: Math.round(w * (entry.scale ?? 2)), withoutEnlargement: true })
        .png()
        .toFile(target)
    }
    made.push(entry.out)
  } catch (e) {
    failed.push(`${entry.out} — ${e.message}`)
  }
}

/**
 * Labeled contact sheet built as SVG so every cell is centred and named —
 * the previous pixel-blit version bled neighbouring rows for non-square assets.
 */
const files = []
for (const entry of MANIFEST) {
  const abs = path.join(OUT, entry.out)
  if (existsSync(abs)) files.push({ name: entry.out, abs })
}

const CELL_W = 150
const CELL_H = 178
const COLS = 5
const gridRows = Math.ceil(files.length / COLS)
const parts = [
  `<svg width="${COLS * CELL_W}" height="${gridRows * CELL_H}" xmlns="http://www.w3.org/2000/svg">`,
  `<rect width="100%" height="100%" fill="#15171d"/>`,
]

for (let i = 0; i < files.length; i++) {
  const { name, abs } = files[i]
  const buf = await sharp(abs, { failOn: 'none' })
    .resize({ width: CELL_W - 20, height: CELL_H - 44, fit: 'inside' })
    .flatten({ background: '#2b2f3a' })
    .png()
    .toBuffer()
  const x = (i % COLS) * CELL_W
  const y = Math.floor(i / COLS) * CELL_H
  parts.push(
    `<rect x="${x + 4}" y="${y + 4}" width="${CELL_W - 8}" height="${CELL_H - 8}" fill="none" stroke="#3a3f4d"/>`,
    `<image x="${x + 10}" y="${y + 10}" width="${CELL_W - 20}" height="${CELL_H - 44}" href="data:image/png;base64,${buf.toString('base64')}"/>`,
    `<text x="${x + 8}" y="${y + CELL_H - 12}" fill="#cfd3dd" font-family="monospace" font-size="11">${name.replace(/[&<>]/g, '')}</text>`,
  )
}
parts.push('</svg>')

mkdirSync(OUT, { recursive: true })
await sharp(Buffer.from(parts.join('')))
  .png()
  .toFile(path.join(OUT, '_contact-sheet.png'))

// PWA icon set: the donor already ships the real app icon at every size.
const DONOR_ICONS = {
  'icon-192.png': 'public/icons/192.png',
  'icon-512.png': 'public/icons/512.png',
  'maskable-512.png': 'public/icons/512.png',
  'apple-touch-icon.png': 'public/icons/apple-touch-icon.png',
  'favicon.png': 'public/icons/64.png',
}
mkdirSync(ICONS, { recursive: true })
for (const [out, rel] of Object.entries(DONOR_ICONS)) {
  const src = D(rel)
  if (!existsSync(src)) {
    failed.push(`icons/${out} — missing ${src}`)
    continue
  }
  const flat = sharp(src, { failOn: 'none' }).flatten({ background: '#009577' })
  await flat.clone().resize(512, 512, { fit: 'inside' }).png().toFile(path.join(ICONS, out))
}
// Maskable needs the glyph inside the ~80% safe circle.
await sharp(D(DONOR_ICONS['maskable-512.png']), { failOn: 'none' })
  .resize(400, 400, { fit: 'inside' })
  .extend({ top: 56, bottom: 56, left: 56, right: 56, background: '#009577' })
  .png()
  .toFile(path.join(ICONS, 'maskable-512.png'))

console.log(`assets: made ${made.length}/${MANIFEST.length}`)
console.log(`icons:  ${readdirSync(ICONS).join(', ')}`)
for (const f of failed) console.log(`FAILED ${f}`)
console.log(`contact sheet -> ${path.join(OUT, '_contact-sheet.png')}`)
