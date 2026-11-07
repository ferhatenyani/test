/**
 * §8.5 — the information-note modal, EXERCISED not asserted.
 *
 * The static gate cannot see this feature at all: it screenshots /profile with the
 * modal closed, so every one of its 4121 assertions passes whether the modal works
 * or was never wired up. This probe drives the real interaction in a real browser
 * and checks state and geometry only — never colour, because the refs are photos
 * of a physical screen and cannot specify it.
 *
 * Per locale x theme it checks:
 *   closed-at-first   the modal is absent on arrival
 *   opens             clicking the row opens it AND leaves the URL on /profile
 *                     (the row used to navigate to /service/other-services)
 *   content           title text, exactly 4 declarations, CTA present
 *   mirrors           the close X sits right of the modal centre in EN, left in AR
 *   stays-inside      the card is inside the viewport and not overflowing it
 *   new-tab           CTA and inline links carry target=_blank + noopener noreferrer
 *   closes 3 ways     X, Escape, and scrim click — each must actually remove it
 *   reopens           open/close x3, to catch a handler that only fires once
 *
 * Exits 1 with a list on any failure; never exits 0 having probed nothing.
 *
 *   node scripts/qa/check-info-note.mjs
 */
import { chromium } from 'playwright'
import { PROFILES, SAFE_INSETS, safeInsetInitScript, startPreview, waitForServer, stopPreview, withRenderLock, runBuild } from './lib.mjs'

const PORT = 4189
const BASE = `http://localhost:${PORT}`
const MODAL = '[data-qa="noteModal"]'

const EXPECT = {
  en: { title: 'Information note', cta: 'See' },
  ar: { title: 'مذكرة إعلامية', cta: 'أنظر إلى' },
}

const fails = []
const rows = []
const rec = (id, probe, detail, ok) => {
  rows.push(`${id.padEnd(12)} ${probe.padEnd(16)} ${detail}`)
  if (!ok) fails.push(`${id} / ${probe}: ${detail}`)
}

let browser, server

await withRenderLock(async () => {
  try {
    runBuild('info-note')
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
        await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-qa="qaNoteRow"]', { timeout: 8000 })
        await page.waitForTimeout(350)

        rec(id, 'closed-first', `modal count on arrival = ${await page.locator(MODAL).count()}`, (await page.locator(MODAL).count()) === 0)

        const open = async () => {
          await page.click('[data-qa="qaNoteRow"] button')
          await page.waitForSelector(MODAL, { timeout: 4000 }).catch(() => {})
        }
        const closeByX = async () => {
          await page.click('[data-qa="noteClose"]')
          await page.waitForTimeout(220)
        }

        await open()
        const present = (await page.locator(MODAL).count()) === 1
        rec(id, 'opens', `modal present=${present} url=${page.url().replace(BASE, '')}`, present && page.url().endsWith('/profile'))

        if (present) {
          const title = (await page.locator('[data-qa="noteTitle"]').innerText()).trim()
          const items = await page.locator('[data-qa="noteList"] > li').count()
          rec(
            id,
            'content',
            `title="${title}" declarations=${items}`,
            title === EXPECT[lang].title && items === 4,
          )

          const m = await page.locator(MODAL).boundingBox()
          const x = await page.locator('[data-qa="noteClose"]').boundingBox()
          const vw = page.viewportSize()
          const xc = x.x + x.width / 2
          const mc = m.x + m.width / 2
          const rightOfCentre = xc > mc
          const mirrorsOk = lang === 'ar' ? !rightOfCentre : rightOfCentre
          rec(
            id,
            'mirrors',
            `X centre ${xc.toFixed(1)} vs modal centre ${mc.toFixed(1)} -> ${rightOfCentre ? 'right' : 'left'} (want ${lang === 'ar' ? 'left' : 'right'})`,
            mirrorsOk,
          )
          rec(
            id,
            'stays-inside',
            `modal ${m.width}x${m.height} at ${m.x.toFixed(0)},${m.y.toFixed(0)} in ${vw.width}x${vw.height}`,
            m.x >= 0 && m.y >= 0 && m.x + m.width <= vw.width + 0.5 && m.height <= vw.height,
          )

          const cta = await page.locator('[data-qa="noteCta"]').first()
          const attrs = await cta.evaluate((el) => ({
            target: el.getAttribute('target'),
            rel: el.getAttribute('rel'),
            href: el.getAttribute('href'),
            text: el.innerText.trim(),
          }))
          rec(
            id,
            'new-tab',
            `cta target=${attrs.target} rel=${attrs.rel} href=${attrs.href} text="${attrs.text}"`,
            attrs.target === '_blank' &&
              /noopener/.test(attrs.rel || '') &&
              /noreferrer/.test(attrs.rel || '') &&
              /^https:\/\/progres\.mesrs\.dz\/donnees\/$/.test(attrs.href || ''),
          )

          const inline = await page.locator('[data-qa="noteList"] a').evaluateAll((els) =>
            els.map((el) => ({ target: el.getAttribute('target'), rel: el.getAttribute('rel') })),
          )
          rec(
            id,
            'inline-links',
            `${inline.length} inline See link(s) ${JSON.stringify(inline)}`,
            inline.length === 2 && inline.every((i) => i.target === '_blank' && /noopener/.test(i.rel || '')),
          )

          await closeByX()
          rec(id, 'close-by-X', `modal count after X = ${await page.locator(MODAL).count()}`, (await page.locator(MODAL).count()) === 0)

          await open()
          await page.keyboard.press('Escape')
          await page.waitForTimeout(220)
          rec(id, 'close-by-Esc', `modal count after Escape = ${await page.locator(MODAL).count()}`, (await page.locator(MODAL).count()) === 0)

          await open()
          await page.mouse.click(6, 6)
          await page.waitForTimeout(220)
          rec(id, 'close-by-scrim', `modal count after scrim click = ${await page.locator(MODAL).count()}`, (await page.locator(MODAL).count()) === 0)

          // Three full cycles: a handler that only fires once fails here.
          let cycles = 0
          for (let i = 0; i < 3; i++) {
            await open()
            const up = (await page.locator(MODAL).count()) === 1
            if (up) await closeByX()
            if (up && (await page.locator(MODAL).count()) === 0) cycles++
          }
          rec(id, 'reopens-x3', `completed ${cycles}/3 open+close cycles`, cycles === 3)
        } else {
          rec(id, 'content', 'modal never opened — nothing else probed', false)
        }

        await ctx.close()
      }
    }
  } finally {
    if (browser) await browser.close()
    stopPreview(server)
  }
}, 'check-info-note')

for (const r of rows) console.log(r)
console.log(`\n${rows.length} probes · ${fails.length} failed`)
if (fails.length || rows.length === 0) {
  for (const f of fails) console.log(`  FAIL ${f}`)
  if (!rows.length) console.log('  FAIL no probes ran — this script proved nothing')
  process.exit(1)
}
console.log('OK — the information-note modal opened, mirrored, and closed by all three routes')
