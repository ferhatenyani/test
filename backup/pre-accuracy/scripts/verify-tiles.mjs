/**
 * Verifies the tile mapping by DECODED PIXELS, not file bytes — the pipeline
 * re-encodes every PNG, so byte hashes never match even when identical.
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DONOR = 'C:/Users/MyHomehP/Desktop/work/old/webetu/public/assets'
const OUT = path.join(ROOT, 'public/assets/tiles')

const EXPECTED = [
  ['percentage', 'academic-transcripts-icon'],
  ['academic-transcripts', 'percentage-icon'],
  ['debts', 'academic-vacation-icon'],
  ['academic-vacation', 'debts-icon'],
  ['discharge', 'discharge-icon'],
  ['timetable', 'timetable-icon'],
  ['group-section', 'group-section-icon'],
  ['exams-schedule', 'exams-schedule-icon'],
  ['exam-grades', 'exam-grades-icon'],
  ['assessment', 'assessment-icon'],
  ['enrollments', 'enrollments-icon'],
  ['other-services', 'other-services-icon'],
]

async function pixels(file) {
  const { data, info } = await sharp(file, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, info }
}

let bad = 0
for (const [slug, donorFile] of EXPECTED) {
  const a = await pixels(path.join(OUT, `${slug}.png`))
  const b = await pixels(path.join(DONOR, `${donorFile}.png`))
  const sameSize = a.info.width === b.info.width && a.info.height === b.info.height
  const sameBytes = sameSize && Buffer.compare(a.data, b.data) === 0
  if (!sameBytes) bad++
  console.log(
    `${sameBytes ? 'PIXEL-IDENTICAL' : 'MISMATCH      '} ${slug.padEnd(21)} ${a.info.width}x${a.info.height}  <- ${donorFile}`,
  )
}
console.log(bad === 0 ? '\nall tile glyphs map to the intended donor artwork' : `\n${bad} mismatched`)
process.exit(bad === 0 ? 0 : 1)
