/**
 * Step 1 of the accuracy harness: render every scenario at the exact device
 * profile its reference capture came from, then dump two things —
 *
 *   qa/out/<id>.png       a viewport screenshot at the capture's own pixel size
 *   qa/measured/<id>.json every [data-qa] element's rect + computed style
 *
 * The JSON is what makes a claim decidable: "the pill is 45 CSS px tall" is
 * checked against the DOM, not argued about from a thumbnail.
 *
 *   node scripts/qa/measure.mjs              # all scenarios
 *   node scripts/qa/measure.mjs 01-login     # id prefix filter
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  ROOT, QA, OUT, MEASURED, PROFILES, SAFE_INSETS, safeInsetInitScript, loadRefs, scenarios,
  startPreview, waitForServer, stopPreview, withRenderLock, runBuild,
} from './lib.mjs'

const PORT = 4181
const BASE = `http://localhost:${PORT}`
mkdirSync(OUT, { recursive: true })
mkdirSync(MEASURED, { recursive: true })

// Reference captures show the typed matricule 202133010290; keep the fixture
// identical to the pixels so filled-state diffs line up.
const REG = '202133010290'
const PASS = 'Passw0rd!'
const LOGIN_BTN = /^(login|continue|تسجيل الدخول|متابعة)$/i

const ACTIONS = {
  async fillLogin(page) {
    await page.fill('#reg', REG)
    await page.fill('#pass', PASS)
    await page.waitForTimeout(250)
  },
  async focusRegFilled(page) {
    await page.fill('#reg', REG)
    await page.focus('#reg')
    await page.waitForTimeout(250)
  },
  async focusPass(page) {
    await page.fill('#pass', PASS)
    await page.focus('#pass')
    await page.waitForTimeout(250)
  },
  async submitEmpty(page) {
    await page.getByRole('button', { name: LOGIN_BTN }).click()
    await page.waitForTimeout(500)
  },
  async throughLogin(page) {
    await page.fill('#reg', REG)
    await page.fill('#pass', PASS)
    await page.getByRole('button', { name: LOGIN_BTN }).click()
    await page.waitForURL('**/verify')
    await page.waitForTimeout(500)
  },
  async revealPass(page) {
    await page.fill('#pass', PASS)
    const eye = page.getByRole('button', { name: /show|hide|password visibility/i })
    if (await eye.count()) await eye.first().click()
    await page.waitForTimeout(250)
  },
  async swipeBanner(page) {
    const box = await page.getByTestId('banner-viewport').boundingBox()
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width * 0.85, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.15, y, { steps: 16 })
    await page.mouse.up()
    await page.waitForTimeout(500)
  },
  async otpHalf(page) {
    await page.fill('#otp-0, [data-qa=otp-0] input, input[aria-label*="1" i]', '1')
    await page.waitForTimeout(250)
  },
}

let server
let browser
const problems = []

await withRenderLock(async () => {
try {
  runBuild('measure')
  server = startPreview(PORT)
  await waitForServer(BASE)
  browser = await chromium.launch()
  for (const [id, sc] of scenarios(loadRefs())) {
    const p = PROFILES[sc.profile]
    if (!p) throw new Error(`${id}: unknown profile "${sc.profile}"`)

    const ctx = await browser.newContext({
      viewport: p.css,
      deviceScaleFactor: p.dpr,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      reducedMotion: 'no-preference',
      serviceWorkers: 'block',
    })
    await ctx.addInitScript((o) => {
      localStorage.setItem('webetu.lang', o.lang || 'en')
      localStorage.setItem('webetu.theme', o.theme || 'light')
      if (o.session) localStorage.setItem('webetu.session', '1')
    }, { ...sc, session: sc.route !== '/login' && sc.route !== '/' })
    // env(safe-area-inset-*) is 0px headless; the capture's device had real
    // insets, so the pages' --safe-top/--safe-bottom are pinned here rather than
    // baked into the components as max() floors.
    await ctx.addInitScript(safeInsetInitScript, SAFE_INSETS[sc.profile])

    const errors = []
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`)
    })

    await page.goto(BASE + sc.route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    for (const a of sc.actions || []) {
      if (!ACTIONS[a]) throw new Error(`${id}: unknown action "${a}"`)
      await ACTIONS[a](page)
    }

    // Focus is a state some captures show and some scenarios exist only to
    // check, so it is captured deliberately instead of destroyed for everyone.
    // A scenario that declares `focusTarget` keeps that focus; every other
    // scenario is blurred exactly as before, so the 30 existing baselines hold.
    if (sc.focusTarget) {
      const target = page.locator(sc.focusTarget)
      if (!(await target.count())) throw new Error(`${id}: focusTarget "${sc.focusTarget}" matched nothing`)
      await target.first().focus()
      await page.waitForTimeout(250)
      // Autofocus can scroll the sheet; the capture is shot from the top, and
      // scrolling does not drop focus, so re-frame but keep the focused element.
      if (!sc.keepScroll) await page.evaluate(() => window.scrollTo(0, 0))
    } else {
      // Autofocus scrolls the page (the OTP box does on /verify); frame from the
      // top so the render and the capture share an origin.
      await page.evaluate(() => {
        document.activeElement?.blur?.()
        window.scrollTo(0, 0)
      })
    }
    await page.waitForTimeout(200)

    const dump = await page.evaluate(() => {
      const els = {}
      const active = document.activeElement
      for (const el of document.querySelectorAll('[data-qa]')) {
        const key = el.getAttribute('data-qa')
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        const px = (v) => (v && v !== 'normal' ? Math.round(parseFloat(v) * 10) / 10 : null)
        els[key] = {
          tag: el.tagName.toLowerCase(),
          x: Math.round(r.x * 10) / 10,
          y: Math.round(r.y * 10) / 10,
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10,
          fontSize: px(cs.fontSize),
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          lineHeight: px(cs.lineHeight),
          letterSpacing: px(cs.letterSpacing) ?? 0,
          textAlign: cs.textAlign,
          color: cs.color,
          bg: cs.backgroundColor,
          // A gradient paints via background-image, under which backgroundColor
          // is transparent — so the stops are dumped too or they are unassertable.
          bgImage: cs.backgroundImage,
          radius: px(cs.borderTopLeftRadius) ?? 0,
          borderWidth: px(cs.borderTopWidth) ?? 0,
          borderColor: cs.borderTopColor,
          boxShadow: cs.boxShadow,
          opacity: Number(cs.opacity),
          focused: el === active,
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
        }
      }
      return {
        dir: document.documentElement.dir,
        lang: document.documentElement.lang,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        scrollY: Math.round(window.scrollY * 10) / 10,
        activeKey:
          active && active !== document.body
            ? active.getAttribute('data-qa') || active.id || active.tagName.toLowerCase()
            : null,
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        count: Object.keys(els).length,
        els,
      }
    })

    if (!dump.count) problems.push(`${id}: no [data-qa] elements found — nothing to measure`)
    if (dump.scrollW > dump.clientW) problems.push(`${id}: horizontal overflow ${dump.scrollW - dump.clientW}px`)

    writeFileSync(path.join(MEASURED, `${id}.json`), JSON.stringify({ id, scenario: sc, dom: dump }, null, 2))
    await page.screenshot({ path: path.join(OUT, `${id}.png`) })

    const unexpected = errors.filter((e) => !/favicon|manifest|Registering/i.test(e))
    if (unexpected.length) problems.push(`${id}: ${[...new Set(unexpected)].join(' | ')}`)
    await ctx.close()
    console.log(`${id.padEnd(28)} ${p.css.width}x${p.css.height}@${p.dpr}  qa=${dump.count}  dir=${dump.dir}`)
  }
} finally {
  if (browser) await browser.close()
  stopPreview(server)
}
}, 'measure')

console.log(`\nrenders -> qa/out   measurements -> qa/measured`)
if (problems.length) {
  console.log(`PROBLEMS (${problems.length}):`)
  for (const p of problems) console.log(`  - ${p}`)
  process.exitCode = 1
}
process.exit(process.exitCode ?? 0)
