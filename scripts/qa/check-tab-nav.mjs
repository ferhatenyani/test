/**
 * §8.6 — the bottom nav must NOT unmount when switching tabs.
 *
 * pixdiff cannot see this: it screenshots one settled page at a time, and a nav
 * that vanishes for 0.26 s between two correct stills looks perfect to it. So this
 * probes the TRANSITION itself, sampling every animation frame across a tab change:
 *
 *   alive    was [data-qa="navBar"] present in EVERY sampled frame?
 *   glide    how many distinct x positions did the active pill pass through?
 *   swapped  did the page content actually change (else we sampled an idle page)
 *   absent   is the nav correctly NOT there on /login and /service?
 *
 * The ramp-vs-step test is the whole point: `layoutId="activeTab"` can only glide
 * while its subtree survives. One or two distinct positions means the pill was
 * destroyed and rebuilt at its new spot, which is the reported bug.
 *
 * Runs both themes x both languages. Exits 1 with a list on any failure and never
 * exits 0 without having probed something.
 *
 *   node scripts/qa/check-tab-nav.mjs
 */
import { chromium } from 'playwright'
import { PROFILES, SAFE_INSETS, safeInsetInitScript, startPreview, waitForServer, stopPreview, withRenderLock, runBuild } from './lib.mjs'

const PORT = 4189
const BASE = `http://localhost:${PORT}`
const NAV = '[data-qa="navBar"]'
const PILL = '[data-qa="navPill"]'

/**
 * Distinct positions that separates a glide from a jump. The pill's own transition
 * is duration 0.2 s, which is ~12 frames at 60 fps, so a real glide yields roughly
 * 8-12 distinct positions and a remount yields 1-2. The threshold sits in that gap
 * rather than being tuned to whatever the run happens to print.
 */
const MIN_GLIDE_STEPS = 6

const fails = []
const rows = []
const rec = (id, probe, detail, ok) => {
  rows.push(`${id.padEnd(12)} ${probe.padEnd(12)} ${detail}`)
  if (!ok) fails.push(`${id} / ${probe}: ${detail}`)
}

/**
 * Sample nav presence and pill x per frame. Started BEFORE the click and awaited
 * after it, so the frames land on the transition and not on an idle page.
 */
const startNavProbe = (page, frames = 70) =>
  page.evaluate(
    ({ nav, pill, frames }) =>
      new Promise((resolve) => {
        const alive = []
        const xs = []
        let n = 0
        const step = () => {
          const bar = document.querySelector(nav)
          alive.push(!!bar)
          const p = document.querySelector(pill)
          xs.push(p ? p.getBoundingClientRect().x : NaN)
          if (++n < frames) requestAnimationFrame(step)
          else resolve({ alive, xs })
        }
        requestAnimationFrame(step)
      }),
    { nav: NAV, pill: PILL, frames },
  )

const distinct = (xs) => new Set(xs.filter(Number.isFinite).map((x) => Math.round(x * 5))).size

let browser, server

await withRenderLock(async () => {
  try {
    runBuild('tab-nav')
    server = startPreview(PORT)
    await waitForServer(BASE)
    browser = await chromium.launch()

    for (const theme of ['light', 'dark']) {
      for (const lang of ['en', 'ar']) {
        const id = `${theme}/${lang}`
        const ctx = await browser.newContext({
          viewport: PROFILES.a360.css,
          deviceScaleFactor: PROFILES.a360.dpr,
          isMobile: true,
          hasTouch: true,
          serviceWorkers: 'block',
        })
        await ctx.addInitScript((o) => {
          localStorage.setItem('webetu.lang', o.lang)
          localStorage.setItem('webetu.theme', o.theme)
          localStorage.setItem('webetu.session', '1')
        }, { lang, theme })
        await ctx.addInitScript(safeInsetInitScript, SAFE_INSETS.a360)

        const page = await ctx.newPage()
        await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
        await page.waitForSelector(NAV, { timeout: 8000 })
        await page.waitForTimeout(400)

        /** Switch tabs by clicking the nav itself, the way a user does. */
        const switchTo = async (key, expectPath, fromPath) => {
          const probe = startNavProbe(page)
          await page.click(`[data-qa="navItem-${key}"]`)
          const { alive, xs } = await probe
          await page.waitForURL(`**${expectPath}`, { timeout: 8000 }).catch(() => {})
          const deadFrames = alive.filter((a) => !a).length
          const steps = distinct(xs)
          const first = xs.find(Number.isFinite)
          const last = [...xs].reverse().find(Number.isFinite)
          const moved = Number.isFinite(first) && Number.isFinite(last) ? Math.abs(last - first) : NaN
          rec(
            id,
            'alive',
            `${fromPath}->${expectPath}: navBar missing in ${deadFrames}/${alive.length} frames`,
            deadFrames === 0,
          )
          rec(
            id,
            'glide',
            `pill x ${Number.isFinite(first) ? first.toFixed(1) : 'na'} -> ${Number.isFinite(last) ? last.toFixed(1) : 'na'} (${Number.isFinite(moved) ? moved.toFixed(1) : 'na'} CSS) over ${steps} distinct position(s)`,
            steps >= MIN_GLIDE_STEPS && Number.isFinite(moved) && moved > 40,
          )
          rec(
            id,
            'swapped',
            `url now ${page.url().replace(BASE, '')}`,
            page.url().endsWith(expectPath),
          )
          await page.waitForTimeout(300)
        }

        // Forward, forward, then back both ways — a one-shot glide still passes the
        // first two and fails the return legs.
        await switchTo('cards', '/cards', '/home')
        await switchTo('profile', '/profile', '/cards')
        await switchTo('cards', '/cards', '/profile')
        await switchTo('home', '/home', '/cards')

        /* ---- the nav must NOT appear where it does not belong ---- */
        await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(300)
        rec(id, 'no-nav-login', `navBar count on /login = ${await page.locator(NAV).count()}`, (await page.locator(NAV).count()) === 0)

        await page.goto(`${BASE}/service/discharge`, { waitUntil: 'networkidle' }).catch(() => {})
        await page.waitForTimeout(400)
        const onService = await page.locator(NAV).count()
        rec(id, 'no-nav-service', `navBar count on /service/* = ${onService} (url ${page.url().replace(BASE, '')})`, onService === 0)

        await ctx.close()
      }
    }
  } finally {
    if (browser) await browser.close()
    stopPreview(server)
  }
}, 'check-tab-nav')

for (const r of rows) console.log(r)
console.log(`\n${rows.length} probes · ${fails.length} failed`)
if (fails.length || rows.length === 0) {
  for (const f of fails) console.log(`  FAIL ${f}`)
  if (!rows.length) console.log('  FAIL no probes ran — this script proved nothing')
  process.exit(1)
}
console.log('OK — the nav survived every tab change and the pill glided')
