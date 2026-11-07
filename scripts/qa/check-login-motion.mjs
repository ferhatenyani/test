/**
 * PHASE 3 — login motion, MEASURED.
 *
 * Nothing here asserts "the class is present". Every check drives the real page
 * in a real browser and prints the number that came out, so an animation that
 * is wired up but invisible (the failure mode a static DOM assertion cannot see)
 * still fails. Probes:
 *
 *   focus      computed border-color + box-shadow before vs after focus
 *   error      error pill border colour + inline message box height
 *   shake      peak-to-trough x delta across 12 frames  (0 = invisible shake)
 *   eye        input[type] before vs after the toggle
 *   push       enter x offset of the route container, forward and backward
 *   reduced    same probes with prefers-reduced-motion: reduce
 *
 * Runs both themes x both languages. Exits 1 with a list on any failure and
 * never exits 0 without having probed something.
 *
 *   node scripts/qa/check-login-motion.mjs
 */
import { chromium } from 'playwright'
import {
  PROFILES, startPreview, waitForServer, stopPreview, withRenderLock, runBuild,
} from './lib.mjs'

const PORT = 4187
const BASE = `http://localhost:${PORT}`
const REG = '202133010290'
const PASS = 'Passw0rd!'
const LOGIN_BTN = /^(login|continue|تسجيل الدخول|متابعة)$/i

const fails = []
const rows = []
const rec = (id, probe, detail, ok) => {
  rows.push(`${id.padEnd(22)} ${probe.padEnd(10)} ${detail}`)
  if (!ok) fails.push(`${id} / ${probe}: ${detail}`)
}

/** Collect one numeric property per animation frame for n frames. */
const sample = (page, selector, prop, frames = 12) =>
  page.evaluate(
    ({ selector, prop, frames }) =>
      new Promise((resolve) => {
        const out = []
        let n = 0
        const step = () => {
          const el = document.querySelector(selector)
          if (!el) {
            out.push(NaN)
          } else {
            const r = el.getBoundingClientRect()
            out.push(prop === 'x' ? r.x : Number(el[prop]))
          }
          if (++n < frames) requestAnimationFrame(step)
          else resolve(out)
        }
        requestAnimationFrame(step)
      }),
    { selector, prop, frames },
  )

const peakToTrough = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x))
  return v.length ? Math.max(...v) - Math.min(...v) : NaN
}

/** Distinct positions seen, which is what separates a ramp from an instant jump. */
const distinctPositions = (xs) =>
  new Set(xs.filter((x) => Number.isFinite(x)).map((x) => Math.round(x * 10))).size

/**
 * Start sampling the route container NOW and hand back the promise. Callers must
 * fill/submit first and click immediately after this starts — sampling before the
 * interaction burns the frames on an idle page and measures nothing.
 */
const startMoveProbe = (page, frames = 40) =>
  page.evaluate(
    ({ frames }) =>
      new Promise((resolve) => {
        const xs = []
        let n = 0
        const step = () => {
          // The page is #root > div > div: the outer div is the grid that lets the
          // two route pages share one cell during the overlapping push.
          const el = document.querySelector('#root > div > div')
          xs.push(el ? el.getBoundingClientRect().x : NaN)
          if (++n < frames) requestAnimationFrame(step)
          else resolve(xs)
        }
        requestAnimationFrame(step)
      }),
    { frames },
  )

const styleOf = (page, selector, props) =>
  page.evaluate(
    ({ selector, props }) => {
      const el = document.querySelector(selector)
      if (!el) return null
      const cs = getComputedStyle(el)
      const o = {}
      for (const p of props) o[p] = p === 'height' ? el.getBoundingClientRect().height : cs[p]
      return o
    },
    { selector, props },
  )

const isReddish = (rgb) => {
  const m = String(rgb).match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (!m) return false
  const [r, g, b] = [+m[1], +m[2], +m[3]]
  return r > g + 24 && r > b + 24
}

let browser, server

await withRenderLock(async () => {
  try {
    runBuild('login-motion')
    server = startPreview(PORT)
    await waitForServer(BASE)
    browser = await chromium.launch()

    for (const theme of ['light', 'dark']) {
      for (const lang of ['en', 'ar']) {
        for (const motion of ['no-preference', 'reduce']) {
          const id = `${theme}/${lang}/${motion === 'reduce' ? 'RM' : 'anim'}`
          const ctx = await browser.newContext({
            viewport: PROFILES.a360.css,
            deviceScaleFactor: PROFILES.a360.dpr,
            isMobile: true,
            hasTouch: true,
            reducedMotion: motion,
            serviceWorkers: 'block',
          })
          await ctx.addInitScript(
            (o) => {
              localStorage.setItem('webetu.lang', o.lang)
              localStorage.setItem('webetu.theme', o.theme)
              localStorage.removeItem('webetu.session')
            },
            { lang, theme },
          )
          const page = await ctx.newPage()
          await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
          await page.waitForTimeout(400)

          /* ---- focus: border + glow before vs after ---- */
          const before = await styleOf(page, '[data-qa="pill-reg"]', ['borderColor', 'boxShadow'])
          await page.focus('#reg')
          await page.waitForTimeout(300)
          const after = await styleOf(page, '[data-qa="pill-reg"]', ['borderColor', 'boxShadow'])
          const borderChanged = before?.borderColor !== after?.borderColor
          const glowGrew =
            before?.boxShadow !== after?.boxShadow && /rgba?\(\s*0[,\s]+149[,\s]+119/.test(String(after?.boxShadow))
          rec(
            id,
            'focus',
            `border ${before?.borderColor} -> ${after?.borderColor}; shadow ${before?.boxShadow} -> ${after?.boxShadow}`,
            borderChanged && glowGrew,
          )
          await page.evaluate(() => document.activeElement?.blur?.())
          await page.waitForTimeout(250)

          /* ---- eye toggle: input[type] before vs after ---- */
          await page.fill('#pass', PASS)
          await page.waitForTimeout(200)
          const typeBefore = await page.getAttribute('#pass', 'type')
          const eye = page.getByRole('button', { name: /toggle password visibility/i })
          const eyeCount = await eye.count()
          let typeAfter = typeBefore
          if (eyeCount) {
            await eye.first().click()
            await page.waitForTimeout(200)
            typeAfter = await page.getAttribute('#pass', 'type')
          }
          rec(
            id,
            'eye',
            `toggle found=${eyeCount} type ${typeBefore} -> ${typeAfter}`,
            eyeCount === 1 && typeBefore === 'password' && typeAfter === 'text',
          )
          if (eyeCount) {
            await eye.first().click()
            await page.waitForTimeout(150)
          }

          /* ---- shake: peak-to-trough x over 12 frames ---- */
          await page.fill('#reg', '')
          await page.fill('#pass', '')
          const shakeFrames = page.evaluate(
            () =>
              new Promise((resolve) => {
                const xs = []
                let n = 0
                const step = () => {
                  const el = document.querySelector('[data-qa="pill-reg"]')
                  xs.push(el ? el.getBoundingClientRect().x : NaN)
                  if (++n < 12) requestAnimationFrame(step)
                  else resolve(xs)
                }
                requestAnimationFrame(step)
              }),
          )
          await page.getByRole('button', { name: LOGIN_BTN }).click()
          const xs = await shakeFrames
          const swing = peakToTrough(xs)
          const expectShake = motion !== 'reduce'
          rec(
            id,
            'shake',
            `x frames ${xs.map((x) => (Number.isFinite(x) ? x.toFixed(1) : 'na')).join(' ')} | peak-to-trough ${Number.isFinite(swing) ? swing.toFixed(2) : 'NaN'} CSS (reduced=${!expectShake})`,
            Number.isFinite(swing) && (expectShake ? swing > 1 : swing <= 1),
          )

          /* ---- error: border colour + inline message box ---- */
          await page.waitForTimeout(400)
          const errPill = await styleOf(page, '[data-qa="pill-reg"]', ['borderColor'])
          const errMsg = await styleOf(page, '[data-qa="err-reg"]', ['height', 'opacity'])
          rec(
            id,
            'error',
            `pill border ${errPill?.borderColor} (reddish=${isReddish(errPill?.borderColor || '')}), message box h ${errMsg ? errMsg.height.toFixed(1) : 'absent'} opacity ${errMsg?.opacity ?? 'na'}`,
            isReddish(errPill?.borderColor || '') && !!errMsg && errMsg.height > 4,
          )

          /* ---- push transition, forward and backward ----
             The transition is a tween, so the test is "did x RAMP": many distinct
             positions means it animated, one or two means it jumped (which is the
             correct behaviour under prefers-reduced-motion). Sampling must start
             after the fills and immediately before the click. */
          await page.fill('#reg', REG)
          await page.fill('#pass', PASS)
          const fwdProbe = startMoveProbe(page)
          await page.getByRole('button', { name: LOGIN_BTN }).click()
          const fwdXs = await fwdProbe
          await page.waitForURL('**/verify', { timeout: 8000 }).catch(() => {})
          const fwdUrl = page.url()
          const fwdSwing = peakToTrough(fwdXs)
          const fwdSteps = distinctPositions(fwdXs)
          rec(
            id,
            'push-fwd',
            `url ${fwdUrl.replace(BASE, '')} | swing ${Number.isFinite(fwdSwing) ? fwdSwing.toFixed(0) : 'NaN'} CSS over ${fwdSteps} distinct position(s) (reduced=${!expectShake})`,
            /\/verify$/.test(fwdUrl) && (expectShake ? fwdSteps >= 10 : fwdSteps <= 8),
          )

          const backProbe = startMoveProbe(page)
          await page.goBack()
          const backXs = await backProbe
          await page.waitForURL('**/login', { timeout: 8000 }).catch(() => {})
          const backUrl = page.url()
          const backSwing = peakToTrough(backXs)
          const backSteps = distinctPositions(backXs)
          rec(
            id,
            'push-back',
            `url ${backUrl.replace(BASE, '')} | swing ${Number.isFinite(backSwing) ? backSwing.toFixed(0) : 'NaN'} CSS over ${backSteps} distinct position(s)`,
            /\/login$/.test(backUrl) && (expectShake ? backSteps >= 10 : backSteps <= 8),
          )

          await ctx.close()
        }
      }
    }
  } finally {
    if (browser) await browser.close()
    stopPreview(server)
  }
}, 'check-login-motion')

for (const r of rows) console.log(r)
console.log(`\n${rows.length} probes · ${fails.length} failed`)
if (fails.length || rows.length === 0) {
  for (const f of fails) console.log(`  FAIL ${f}`)
  if (!rows.length) console.log('  FAIL no probes ran — this script proved nothing')
  process.exit(1)
}
console.log('OK — every motion probe measured a real state change')
