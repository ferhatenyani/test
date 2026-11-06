/**
 * PHASE 4 — home banner carousel, MEASURED.
 *
 * Backward swipes were proven working by a manual probe; this makes that
 * permanent. The failure mode it exists to catch is the one a single-gesture
 * test cannot see: a suite that passes forward and silently clamps on the
 * second gesture.
 *
 * Every gesture prints the track offset and the active dot index AFTER it, so a
 * regression names the gesture that broke rather than just "carousel is wrong".
 *
 * Assertions are GEOMETRY ONLY — track rect.x and dot widths. aria-labels and
 * visible copy are deliberately not matched: when UI copy changes, a
 * string-matching script goes stale and can read green while testing nothing.
 *
 *   node scripts/qa/check-home-carousel.mjs
 */
import { chromium } from 'playwright'
import {
  PROFILES, startPreview, waitForServer, stopPreview, withRenderLock, runBuild,
} from './lib.mjs'

const PORT = 4189
const BASE = `http://localhost:${PORT}`

const fails = []
const rows = []
const rec = (id, probe, detail, ok) => {
  rows.push(`${id.padEnd(16)} ${probe.padEnd(26)} ${detail}`)
  if (!ok) fails.push(`${id} / ${probe}: ${detail}`)
}

/**
 * Track offset + active dot, read as pixels.
 * The active dot is the wider one (8x8 idle, 16x8 active pill), so "which slide
 * is showing" is measurable without trusting any label.
 */
const readState = (page) =>
  page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel)
      return el ? el.getBoundingClientRect() : null
    }
    const track = r('[data-qa="bannerTrack"]')
    const vp = r('[data-qa="bannerViewport"]')
    const dots = [0, 1].map((i) => {
      const b = r(`[data-qa="bannerDot-${i}"]`)
      return b ? { x: b.x, w: b.width } : null
    })
    return {
      trackX: track ? Math.round(track.x * 10) / 10 : NaN,
      vpW: vp ? Math.round(vp.width * 10) / 10 : NaN,
      dots,
      active:
        dots[0] && dots[1] ? (dots[1].w > dots[0].w ? 1 : dots[0].w > dots[1].w ? 0 : -1) : -1,
    }
  })

/** dir=-1 drags right-to-left (next slide); dir=+1 drags left-to-right (previous). */
async function swipe(page, dir) {
  const box = await page.locator('[data-testid="banner-viewport"]').boundingBox()
  const y = box.y + box.height / 2
  const from = dir === -1 ? box.x + box.width * 0.85 : box.x + box.width * 0.15
  const to = dir === -1 ? box.x + box.width * 0.15 : box.x + box.width * 0.85
  await page.mouse.move(from, y)
  await page.mouse.down()
  await page.mouse.move(to, y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  return readState(page)
}

const fmt = (s) => `trackX ${s.trackX} | vpW ${s.vpW} | dots ${s.dots.map((d) => (d ? d.w.toFixed(1) : 'na')).join('/')} | active ${s.active}`

let browser, server

await withRenderLock(async () => {
  try {
    runBuild('home-carousel')
    server = startPreview(PORT)
    await waitForServer(BASE)
    browser = await chromium.launch()

    for (const theme of ['light', 'dark']) {
      for (const lang of ['en', 'ar']) {
        const id = `${theme}/${lang}`
        const ctx = await browser.newContext({
          viewport: PROFILES.a394.css,
          deviceScaleFactor: PROFILES.a394.dpr,
          isMobile: true,
          hasTouch: true,
          reducedMotion: 'no-preference',
          serviceWorkers: 'block',
        })
        await ctx.addInitScript(
          (o) => {
            localStorage.setItem('webetu.lang', o.lang)
            localStorage.setItem('webetu.theme', o.theme)
            localStorage.setItem('webetu.session', '1')
          },
          { lang, theme },
        )
        const page = await ctx.newPage()
        await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(500)

        /* ---- initial state ---- */
        const s0 = await readState(page)
        // Slide 0's home is the banner's page margin (captures put it at x 24),
        // NOT 0 — trackX is an absolute viewport coordinate, so every "is it at
        // the start / end" test below is relative to this reading.
        const home = s0.trackX
        rec(
          id,
          'initial',
          `${fmt(s0)} | home ${home}`,
          s0.active === 0 && Math.abs(s0.trackX - home) < 1 && s0.vpW > 100,
        )

        /* ---- forward to the end, then past it (clamp) ---- */
        const f1 = await swipe(page, -1)
        const movedF = s0.trackX - f1.trackX
        rec(
          id,
          'fwd-1 (slide 0->1)',
          `${fmt(f1)} | delta ${movedF.toFixed(1)} CSS`,
          f1.active === 1 && Math.abs(movedF - f1.vpW) <= 2,
        )

        const f2 = await swipe(page, -1)
        rec(
          id,
          'fwd-2 must CLAMP at end',
          `${fmt(f2)} | delta from f1 ${(f1.trackX - f2.trackX).toFixed(1)} CSS`,
          f2.active === 1 && Math.abs(f2.trackX - f1.trackX) < 1,
        )

        /* ---- backward to the start, then past it (clamp) ---- */
        const b1 = await swipe(page, 1)
        const movedB = b1.trackX - f2.trackX
        rec(
          id,
          'back-1 (slide 1->0)',
          `${fmt(b1)} | delta ${movedB.toFixed(1)} CSS`,
          b1.active === 0 && Math.abs(movedB - b1.vpW) <= 2,
        )

        const b2 = await swipe(page, 1)
        rec(
          id,
          'back-2 must CLAMP at start',
          `${fmt(b2)} | delta from back-1 ${(b2.trackX - b1.trackX).toFixed(1)} CSS`,
          b2.active === 0 && Math.abs(b2.trackX - b1.trackX) < 1,
        )

        /* ---- full round trips catch one-shot bugs a single pair cannot ---- */
        let cur = b2
        let okRound = true
        for (let n = 1; n <= 3; n++) {
          const out = await swipe(page, -1)
          const back = await swipe(page, 1)
          const sane = out.active === 1 && back.active === 0 && Math.abs(back.trackX - home) < 1
          rec(
            id,
            `round-trip ${n} (fwd+back)`,
            `out: active ${out.active} trackX ${out.trackX} | back: ${fmt(back)}`,
            sane,
          )
          okRound = okRound && sane
          cur = back
        }

        /* ---- the dot is a control, not decoration: click must move the track ---- */
        await page.locator('[data-testid="banner-dot-1"]').click()
        await page.waitForTimeout(500)
        const dotClick = await readState(page)
        rec(id, 'dot-1 click', fmt(dotClick), dotClick.active === 1 && dotClick.trackX < cur.trackX - 1)

        await ctx.close()
      }
    }
  } finally {
    if (browser) await browser.close()
    stopPreview(server)
  }
}, 'check-home-carousel')

for (const r of rows) console.log(r)
console.log(`\n${rows.length} probes · ${fails.length} failed`)
if (fails.length || rows.length === 0) {
  for (const f of fails) console.log(`  FAIL ${f}`)
  if (!rows.length) console.log('  FAIL no probes ran — this script proved nothing')
  process.exit(1)
}
console.log('OK — forward, backward, both clamps and 3 round trips measured real movement')
