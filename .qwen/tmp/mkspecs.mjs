/**
 * Scratch generator for qa/specs/2x-home-*.json (not app code, not a harness
 * file). Every number is transcribed from the a394 home captures with
 * scripts/qa/pxprobe.mjs (device px / 1.5); the derivation is written into each
 * spec's `source` string.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const json = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const en = { ...json('src/i18n/en/services.json'), ...json('src/i18n/en/nav.json'), ...json('src/i18n/en/home.json') }
const ar = { ...json('src/i18n/ar/services.json'), ...json('src/i18n/ar/nav.json'), ...json('src/i18n/ar/home.json') }
const SLUGS = Object.keys(json('src/i18n/en/services.json'))

const SERVICES = SLUGS.map((s) => [s, en[s], ar[s]])
const NAV = [
  ['home', en.home, ar.home],
  ['cards', en.cards, ar.cards],
  ['profile', en.profile, ar.profile],
]
const TITLE = { en: en.title, ar: ar.title }

// Grid geometry from the captures: 7 rows x 2 cols, first tile top 235.5,
// measured row tops 235.5/297/358.5/420.5/482/544/605.5 -> pitch 61.667.
const GRID_TOP = 235.5
const PITCH = 61.667
const COL_X = [24, 203]
const TILE_W = 167
const TILE_H = 58

const SCEN = [
  ['20-home-en-light', 'en', 'light', 1, 'WhatsApp Image 2026-10-25 at 18.18.55.jpeg'],
  ['21-home-en-light-slide2', 'en', 'light', 2, 'WhatsApp Image 2026-10-25 at 18.22.04.jpeg'],
  ['22-home-en-dark', 'en', 'dark', 1, 'WhatsApp Image 2026-10-25 at 18.56.55 (1).jpeg'],
  ['23-home-en-dark-slide2', 'en', 'dark', 2, 'WhatsApp Image 2026-10-25 at 18.56.55.jpeg'],
  ['24-home-ar-dark', 'ar', 'dark', 1, 'WhatsApp Image 2026-10-25 at 18.56.17.jpeg'],
  ['25-home-ar-dark-slide2', 'ar', 'dark', 2, 'WhatsApp Image 2026-10-25 at 18.56.18.jpeg'],
]

const INK_LIGHT = '#111215' // darkest 6% of the 18.22.04 title band
const INK_DARK = '#f2f3f7' // lightest 6% of the 18.56.55 (1) title band
const TILE_GREEN = '#009577' // sampled #019575 / #019477 / #009577
const NAV_BG = '#33354e' // sampled #33354e at (197,800) in both themes
const DOT_OFF = '#cbcbcb' // sampled #cbcbcd (light) / #cbcbcb (dark)

function build(id, lang, theme, slide, capture) {
  const rtl = lang === 'ar'
  const ink = theme === 'light' ? INK_LIGHT : INK_DARK
  const titleFs = rtl ? 22 : 20
  const labelFs = rtl ? 11.4 : 9
  const navLabelFs = rtl ? 10 : 8.5
  const els = []

  els.push({ key: 'homeShell', expect: { x: 0, y: 0, w: 394, bg: theme === 'light' ? '#f5f6f8' : '#101115' } })
  els.push({ key: 'homeHeader', expect: { x: 24, y: 51.5, w: 346, h: 52 } })
  els.push({
    key: 'homeTitle',
    expect: {
      x: rtl ? undefined : 24,
      y: 51.5 + (52 - titleFs) / 2,
      h: titleFs,
      fontSize: titleFs,
      fontWeight: '800',
      color: ink,
      text: TITLE[lang],
    },
  })
  els.push({
    key: 'themeToggle',
    expect: { x: rtl ? 31 : 323, y: 57.5, w: 40, h: 40 },
  })
  els.push({
    key: 'themeToggleIcon',
    expect: { x: rtl ? 36.5 : 328.5, y: 63, w: 29, h: 29 },
  })

  els.push({ key: 'bannerViewport', expect: { x: 24, y: 111, w: 346, h: 101, radius: 10 } })
  els.push({ key: 'bannerSlide-0', expect: { w: 346, h: 101 } })
  els.push({ key: 'bannerDots', expect: { x: 24, y: 222.5, w: 346, h: 8 } })
  const on = { w: 16, bg: TILE_GREEN }
  const off = { w: 8, bg: DOT_OFF }
  // The pair is centred as a 32px group on x=197 (measured 181..213): the 16px
  // pill and the 8px dot swap ends with the slide, so the inactive dot sits at
  // 205 on slide 1 and the pill starts at 197 on slide 2.
  const a = { x: 181, ...slide === 1 ? on : off }
  const b = { x: slide === 1 ? 205 : 197, ...slide === 1 ? off : on }
  els.push({ key: 'bannerDot-0', expect: { y: 222.5, h: 8, radius: 4, ...a }, tol: { color: 2 } })
  els.push({ key: 'bannerDot-1', expect: { y: 222.5, h: 8, radius: 4, ...b }, tol: { color: 2 } })

  els.push({ key: 'tileGrid', expect: { x: 24, y: GRID_TOP, w: 346, h: 427.5 } })

  SERVICES.forEach(([slug, en, ar], i) => {
    const col = i % 2
    const row = (i - col) / 2
    const x = COL_X[col]
    const y = GRID_TOP + row * PITCH
    els.push({
      key: `tile-${i}`,
      expect: { x, y: +y.toFixed(1), w: TILE_W, h: TILE_H, radius: 9, borderWidth: 1, bg: TILE_GREEN, text: rtl ? ar : en },
      tol: { color: 1 },
    })
    els.push({
      key: `tileGlyph-${i}`,
      // centred in the tile's content box: 1px border inset, so the 20px box
      // starts at tileX + 1 + (165 - 20)/2 = tileX + 73.5
      expect: { x: x + 73.5, y: +(y + 8).toFixed(1), w: 20, h: 20 },
    })
    els.push({
      key: `tileLabel-${i}`,
      expect: { fontSize: labelFs, fontWeight: '600', color: '#ffffff', text: rtl ? ar : en },
    })
  })

  els.push({ key: 'navBar', expect: { x: 24, y: 744.5, w: 346, h: 66, radius: 12, bg: NAV_BG } })
  els.push({ key: 'navPill', expect: { x: 24, y: 744.5, w: 115.3, h: 66, radius: 12, bg: TILE_GREEN }, tol: { color: 1 } })
  NAV.forEach(([key, en, ar], i) => {
    els.push({ key: `navItem-${key}`, expect: { x: +(24 + i * 115.33).toFixed(1), y: 744.5, w: 115.3, h: 66 } })
    els.push({ key: `navIcon-${key}`, expect: { x: +(24 + i * 115.33 + 47.7).toFixed(1), y: 756.5, w: 20, h: 20 } })
    els.push({ key: `navLabel-${key}`, expect: { fontSize: navLabelFs, color: '#ffffff', text: rtl ? ar : en } })
  })

  const components = els.map((c) => {
    const expect = Object.fromEntries(Object.entries(c.expect).filter(([, v]) => v !== undefined))
    return { ...c, expect }
  })

  return {
    source:
      `${capture} (profile a394, 591x1280 device = 394x853 CSS, device px / 1.5). ` +
      'All numbers read with scripts/qa/pxprobe.mjs and re-checked against the matching ' +
      'qa/out render with the identical call. Header/banner/grid/nav edges from row+col ' +
      'scanlines; glyph and label sizes from bbox with BG set to the tile green (#019477) ' +
      'or the nav green/navy. Text colours from the darkest / lightest 6% mean of the ' +
      'title band. Tile order and wording verified per position: the AR capture glyph ink ' +
      'boxes are identical to the EN capture glyph ink boxes at the same screen position, ' +
      'so tile 0 sits top-LEFT in Arabic too.',
    page: { dir: rtl ? 'rtl' : 'ltr', lang },
    components,
  }
}

for (const [id, lang, theme, slide, capture] of SCEN) {
  const spec = build(id, lang, theme, slide, capture)
  const file = path.join(ROOT, 'qa/specs', `${id}.json`)
  writeFileSync(file, JSON.stringify(spec, null, 2) + '\n', 'utf8')
  console.log(`wrote qa/specs/${id}.json  (${spec.components.length} components)`)
}
