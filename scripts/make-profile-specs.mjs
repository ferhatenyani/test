/**
 * Emits qa/specs/4x-profile-*.json (PHASE 5).
 *
 * WHY A GENERATOR: eight scenarios that differ only by theme/language/viewport
 * hand-written as eight JSON files drift. The template below is the reviewable
 * artefact; the files are derived.
 *
 * Every assertion here is non-circular, because Profile has NO readable
 * reference (only two 2048x1536 photos of a physical screen). Three sources are
 * allowed, and nothing else:
 *
 *  1. ORDER  — a relation between two elements, which cannot be produced by
 *     reading one render back into a spec (this is why check.mjs grew the
 *     `order` field; see qa/PENDING.md scenario-37 false-green).
 *  2. NAV GEOMETRY transferred from qa/specs/20/22/24-home-* — the SAME
 *     BottomNav component on the SAME a394 viewport, with the pill moved to the
 *     Profile slot by the active-item rule. Falsifiable: if `dir="ltr"` were
 *     dropped from BottomNav the AR specs would break, and if the pill failed to
 *     move these numbers would be wrong.
 *  3. COLOUR taken from the clean login/home captures (#f5f6f8 / #ffffff light,
 *     #101115 / #171a21 dark, each flat over 200-2000 px), asserted to reach the
 *     Profile elements — i.e. checking that the tokens actually apply here.
 *
 * DELIBERATELY ABSENT: any absolute y/x/size for Profile's OWN content, and any
 * icon-vs-label leading-edge claim in Arabic. Whether the row icon mirrors in RTL
 * is exactly the per-component question that needs a readable AR reference, and
 * the photos cannot settle it. Asserting the current render's answer would be a
 * false green waiting to be believed. See qa/PENDING.md PHASE 5 limitation.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const SPECS = path.resolve('qa/specs')

// Transferred from qa/specs/20-home-en-light.json + 24-home-ar-dark.json (a394).
const NAV = {
  bar: { x: 24, y: 744.5, w: 346, h: 66, radius: 12, bg: '#33354e' },
  // The pill sits under the ACTIVE item: /profile -> the third slot.
  pill: { x: 254.7, y: 744.5, w: 115.3, h: 66, radius: 12, bg: '#009577' },
  itemHome: { x: 24, y: 744.5, w: 115.3, h: 66 },
  itemCards: { x: 139.3, y: 744.5, w: 115.3, h: 66 },
  itemProfile: { x: 254.7, y: 744.5, w: 115.3, h: 66 },
  iconProfile: { x: 302.4, y: 756.5, w: 20, h: 20 },
  labelEn: { fontSize: 8.5, color: '#ffffff', text: 'Profile' },
  labelAr: { fontSize: 10, color: '#ffffff', text: 'حسابي' },
}

const PALETTE = {
  light: { page: '#f5f6f8', card: '#ffffff' },
  dark: { page: '#101115', card: '#171a21' },
}

const ORDER_MAIN = [
  'qaHeaderCard',
  'qaName',
  'qaPiLabel',
  'qaInfoCard',
  'qaSetLabel',
  'qaSetCard',
  'qaLogout',
]
const ORDER_INFO = ['qaPob', 'qaInfoHair', 'qaDob']
const ORDER_SETTINGS = [
  'qaLangRow',
  'qaSetHair1',
  'qaThemeRow',
  'qaSetHair2',
  'qa2faRow',
  'qaSetHair3',
  'qaNoteRow',
]

const comp = (key, expect, tol = undefined) => ({
  key,
  expect,
  ...(tol ? { tol } : {}),
})

function build({ id, lang, theme, profile, note }) {
  const c = PALETTE[theme]
  const rtl = lang === 'ar'
  const components = [
    comp('qaPage', { x: 0, y: 0, w: profile === 'a394' ? 394 : 360, bg: c.page }, { color: 6 }),
    comp('qaHeaderCard', { bg: c.card }, { color: 6 }),
    comp('qaInfoCard', { bg: c.card }, { color: 6 }),
    comp('qaSetCard', { bg: c.card }, { color: 6 }),
  ]

  // a360 gets NO nav geometry: home's nav is capture-verified on a394 only, and
  // the nav's bottom inset differs per profile, so there is nothing honest to
  // transfer. Order + colour + the RTL page contract still apply.
  if (profile === 'a394') {
    components.push(
      comp('navBar', NAV.bar, { geom: 2, color: 8, radius: 1 }),
      comp('navPill', NAV.pill, { geom: 2, color: 8, radius: 1 }),
      comp('navItem-home', NAV.itemHome, { geom: 2 }),
      comp('navItem-cards', NAV.itemCards, { geom: 2 }),
      comp('navItem-profile', NAV.itemProfile, { geom: 2 }),
      comp('navIcon-profile', NAV.iconProfile, { geom: 2 }),
      comp('navLabel-profile', rtl ? NAV.labelAr : NAV.labelEn, { geom: 2, color: 8 }),
    )
  }

  return {
    source:
      `NO reference capture — ids 40-47 are gated by relations and transferred numbers only. ` +
      `Profile's only refs are "WhatsApp Image 2026-10-25 at 18.34.09" x2: 2048x1536 photos OF A ` +
      `PHYSICAL SCREEN (landscape, moire, perspective), usable for order/proportion, never for ` +
      `CSS px or colour. Nav numbers are transferred from qa/specs/${
        rtl ? '24-home-ar-dark' : theme === 'dark' ? '22-home-en-dark' : '20-home-en-light'
      }.json (same BottomNav, same ${profile} viewport, pill moved to the Profile slot). ` +
      `Colours come from the clean login/home captures. ${note}`,
    page: { dir: rtl ? 'rtl' : 'ltr', lang },
    // Three chains, NOT one flattened list: qaPob lives INSIDE qaInfoCard, so it
    // is above qaLogout and comparing the tail of one chain to the head of the
    // next is meaningless (it produced 8 false failures on the first run).
    order: [ORDER_MAIN, ORDER_INFO, ORDER_SETTINGS],
    components,
  }
}

const SCENARIOS = [
  { id: '40-profile-en-light', lang: 'en', theme: 'light', profile: 'a394', note: '' },
  { id: '41-profile-en-dark', lang: 'en', theme: 'dark', profile: 'a394', note: '' },
  { id: '42-profile-ar-light', lang: 'ar', theme: 'light', profile: 'a394', note: '' },
  { id: '43-profile-ar-dark', lang: 'ar', theme: 'dark', profile: 'a394', note: '' },
  {
    id: '44-profile-en-light-a360',
    lang: 'en',
    theme: 'light',
    profile: 'a360',
    note: 'a360 carries no nav geometry (unverified for that viewport).',
  },
  { id: '45-profile-en-dark-a360', lang: 'en', theme: 'dark', profile: 'a360', note: 'a360 carries no nav geometry.' },
  { id: '46-profile-ar-light-a360', lang: 'ar', theme: 'light', profile: 'a360', note: 'a360 carries no nav geometry.' },
  { id: '47-profile-ar-dark-a360', lang: 'ar', theme: 'dark', profile: 'a360', note: 'a360 carries no nav geometry.' },
]

for (const s of SCENARIOS) {
  const file = path.join(SPECS, `${s.id}.json`)
  writeFileSync(file, JSON.stringify(build(s), null, 2) + '\n')
  console.log('wrote', path.relative(process.cwd(), file))
}
