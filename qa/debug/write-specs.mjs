/**
 * write-specs.mjs — emits qa/specs/<id>.json for the service scenarios from one
 * table of numbers transcribed by qa/debug/{service-scan,art-geom,detail-scan,
 * chips-scan}.mjs (raw capture pixels / 1.5). Scratch tooling.
 *
 * y values are on the CAPTURE grid, not "app-relative": the header reserves the
 * 25 CSS status bar as green, so a render row and a capture row are the same row.
 *
 *   node qa/debug/write-specs.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SPECS = path.join(ROOT, 'qa/specs')
mkdirSync(SPECS, { recursive: true })

const SRC = '18.26.05*/18.26.06* captures, raw device px / 1.5 via qa/debug/{service-scan,art-geom,detail-scan,chips-scan}.mjs'

const header = (title, rtl) => [
  { key: 'svcHeader', expect: { x: 0, y: 0, w: 360, h: 91.7, bg: '#009577' } },
  { key: 'svcBand', expect: { x: 0, y: 25, w: 360, h: 66.7 } },
  { key: 'svcBack', expect: { x: rtl ? 300.7 : 18, y: 35.7, w: 41.3, h: 41.3, radius: 20.65, bg: 'rgba(255,255,255,0.2)' } },
  { key: 'svcTitle', expect: { y: 50.3, h: 16, w: 360, cx: 180, fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#ffffff', text: title } },
]
const art = (y, tol = {}) => ({ key: 'svcArt', expect: { x: 28.7, y, w: 302.7, h: 273.3 }, ...(Object.keys(tol).length ? { tol } : {}) })
const cap = (y, size, colour, text, tol = {}) => ({
  key: 'svcCaption', expect: { y, w: 360, cx: 180, fontSize: size, fontWeight: '700', color: colour, text },
  ...(Object.keys(tol).length ? { tol } : {}),
})
const DISAGREE = 'reference set disagrees on this element; component follows the 18.26.05 pair'

const specs = {
  '30-service-discharge-en': {
    source: `${SRC} — caption is the two-line "Based on your profile…" sentence, ink x 16.7..344 / 96..264, y 445.3..492.7`,
    page: { dir: 'ltr', lang: 'en' },
    components: [...header('Discharge'), art(171.3), cap(445.3, 13.5, '#1a1a20', 'Based on your profile, this information is not relevant to your needs.')],
  },
  '31-service-discharge-ar': {
    source: `${SRC} — same page in Arabic: arrow moves to the right edge, title stays centred at cx 180`,
    page: { dir: 'rtl', lang: 'ar' },
    components: [...header('التبرئة الإلكترونية', true), art(171.3), cap(445.3, 13.5, '#1a1a20', 'عذرا، انت غير معني')],
  },
  '32-service-exam-grades': {
    source: `${SRC} — art top 165.8 and caption 440 here vs 171.3/445.3 on the two Discharge captures. ${DISAGREE}`,
    page: { dir: 'ltr', lang: 'en' },
    components: [...header('Exam Grades'), art(165.8, { geom: 6 }), cap(440, 13.5, '#1a1a20', 'Data not available currently!', { geom: 6 })],
  },
  '33-service-group-section': {
    source: `${SRC} — art top 179.1, caption 464: same sentence as 32 but muted and ~11% narrower (ink 185.3 vs 207.3). ${DISAGREE}`,
    page: { dir: 'ltr', lang: 'en' },
    components: [...header('Group and Section'), art(179.1, { geom: 8 }), cap(464, 12, '#6c7278', 'Data not available currently!', { geom: 8 })],
  },
  '34-service-exams-schedule': {
    source: `${SRC} — calendar-x glyph ink 34x37.3 on a #f3f4f6 disc at y 213.3, caption 42 CSS under it`,
    page: { dir: 'ltr', lang: 'en' },
    components: [
      ...header('Exams Schedule'),
      { key: 'svcGlyphDisc', expect: { y: 213.3, w: 42.7, h: 42.7, cx: 180, radius: 21.35, bg: '#f3f4f6' } },
      cap(297.3, 12, '#6c7278', 'Data not available currently!'),
    ],
  },
  '35-service-assessment-blank': {
    source: `${SRC} — nothing below the band: the body ink bbox under it is 0.7 CSS tall (the band antialiasing only)`,
    page: { dir: 'ltr', lang: 'en' },
    components: [...header('Assessment')],
  },
  '36-service-transcripts-chips': {
    source: `${SRC} — pills y 102..138.7, first pill x 4.67, pill w 88 gap 16, row runs past x 360 so it scrolls; art at 165.8; NO caption under the art`,
    page: { dir: 'ltr', lang: 'en' },
    components: [
      ...header('Academic transcripts'),
      { key: 'svcChipRow', expect: { x: 0, y: 91.7, w: 360, h: 47 } },
      { key: 'svcChip', expect: { x: 4.7, y: 102, w: 88, h: 36.7, radius: 18.35, borderWidth: 1.5, borderColor: '#009577', color: '#009577', fontWeight: '700', text: '2025/2026' } },
      { key: 'svcChip2', expect: { x: 108.7, y: 102, w: 88, text: '2024/2025' } },
      { key: 'svcChip3', expect: { x: 212.7, y: 102, w: 88, text: '2023/2024' } },
      art(165.8, { geom: 6 }),
    ],
  },
  '37-service-timetable-days': {
    source: `${SRC} — reference band is 122 CSS tall with a scrolling day-pill row at y 157.3..198 and a "No classes scheduled" glyph. NOT implemented — see qa/requests/service.md`,
    page: { dir: 'ltr', lang: 'en' },
    components: [...header('Timetable')],
  },
  '38-service-unknown-slug': {
    source: 'behaviour, not pixels — an unknown slug must leave /service/* rather than render an empty page',
    page: { dir: 'ltr', lang: 'en' },
    components: [],
  },
  '39-service-transcripts-chips-rtl': {
    source: `${SRC} — RTL mirror of 36: arrow to the right edge, title still centred, pill row still LTR (2025/2026 leftmost)`,
    page: { dir: 'rtl', lang: 'ar' },
    components: [
      ...header('كشف النقاط', true),
      { key: 'svcChipRow', expect: { x: 0, y: 91.7, w: 360, h: 47 } },
      { key: 'svcChip', expect: { x: 4.7, y: 102, w: 88, h: 36.7, radius: 18.35, borderWidth: 1.5, borderColor: '#009577', color: '#009577', text: '2025/2026' } },
    ],
  },
}

for (const [id, spec] of Object.entries(specs)) {
  writeFileSync(path.join(SPECS, `${id}.json`), JSON.stringify(spec, null, 2) + '\n')
  console.log(`wrote qa/specs/${id}.json (${spec.components.length} components)`)
}
