/**
 * Derives every PWA / iOS icon size from the app's own mark.
 *
 * The master is public/icons/icon-512.png — the Webetu "P" tile (dark squircle on
 * #009577). It is deliberately NOT public/assets/logo-progress.png: that file is the
 * PROGRES ministry wordmark (swoosh + "PROGRES" + Arabic/French lines + flag), a
 * different artwork that would silently produce the wrong launcher icon.
 *
 * Run: npm run assets:icons
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ICONS_DIR = path.resolve('public/icons')
const MASTER = path.join(ICONS_DIR, 'icon-512.png')
const BG = '#009577' // sampled from the master's own edge pixels

const TARGETS = [
  { file: 'icon-192.png', size: 192, note: 'manifest "any" 192 — Chrome installability requires this size' },
  { file: 'apple-touch-icon.png', size: 180, note: 'iOS Home Screen; must be opaque' },
  { file: 'favicon.png', size: 48, note: 'tab icon' },
]

// A maskable icon must bleed to every edge and keep its content inside the central
// 80% safe zone. The master's mark fills ~95% and carries transparent pixels in the
// diagonal corners, so it is flattened onto the brand green and scaled into the safe zone.
const MASKABLE = { file: 'maskable-512.png', size: 512, contentScale: 0.8 }

async function decodedSize(file) {
  const { width, height } = await sharp(file).metadata()
  return `${width}x${height}`
}

async function nonOpaquePixels(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let n = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) n++
  return n
}

async function main() {
  if (!fs.existsSync(MASTER)) throw new Error(`master missing: ${MASTER}`)
  console.log(`master ${path.basename(MASTER)} ${await decodedSize(MASTER)}\n`)

  const declared = []

  for (const t of TARGETS) {
    const out = path.join(ICONS_DIR, t.file)
    await sharp(MASTER)
      .flatten({ background: BG })
      .resize(t.size, t.size, { fit: 'contain', background: BG })
      .png({ compressionLevel: 9 })
      .toFile(out + '.tmp')
    fs.renameSync(out + '.tmp', out)
    declared.push({ out, want: `${t.size}x${t.size}`, note: t.note })
  }

  const canvas = MASKABLE.size
  const content = Math.round(canvas * MASKABLE.contentScale)
  const mark = await sharp(MASTER).flatten({ background: BG }).resize(content, content).png().toBuffer()
  const out = path.join(ICONS_DIR, MASKABLE.file)
  await sharp({
    create: { width: canvas, height: canvas, channels: 4, background: BG },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(out + '.tmp')
  fs.renameSync(out + '.tmp', out)
  declared.push({
    out,
    want: `${canvas}x${canvas}`,
    note: `maskable, mark at ${MASKABLE.contentScale * 100}% inside the safe zone, no transparency`,
  })

  let bad = 0
  for (const d of declared) {
    const got = await decodedSize(d.out)
    const holes = await nonOpaquePixels(d.out)
    const ok = got === d.want && holes === 0
    if (!ok) bad++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${path.basename(d.out).padEnd(22)} ${got.padEnd(10)} opaque:${holes === 0 ? 'yes' : holes}   ${d.note}`)
  }
  if (bad) throw new Error(`${bad} icon(s) did not decode at the declared size`)
  console.log('\nall icons decode at their declared sizes')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
