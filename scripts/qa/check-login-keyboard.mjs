/**
 * PHASE 3b — the login keyboard lift, MEASURED IN BOTH KEYBOARD MODES.
 *
 * The lift is the one login feature a static render cannot prove: qa/out/05 is a
 * keyboard-up capture whose page is translated 120 CSS px, so its pixdiff has been
 * a known ~24% offset by design, and the previous pass therefore left the whole
 * feature un-automated and said "verify by eye on a real phone". The eye came back
 * with two defects the static gate could not see — the PROGRES card was being
 * scrolled off the top, and the header bounced on the way in.
 *
 * This closes that gap WITHOUT touching production code: the harness installs a
 * fake `window.visualViewport` (an EventTarget with a settable height) before the
 * app boots and dispatches `resize` on it, which is exactly the signal
 * useKeyboardInset.js listens to. No test hook ships, no CDP keyboard emulation.
 *
 * Two modes are driven because real devices pick one and they disagree:
 *
 *   visual  Chrome's web-page default — the layout viewport stays 780, the visual
 *           viewport shrinks. `innerHeight - vv.height` is the keyboard.
 *   content what an installed PWA on Android does, because there is no browser UI
 *           left to collapse into: `innerHeight` shrinks WITH the keyboard, so
 *           visual == layout and that difference is 0. A hook that only understood
 *           `visual` reported "no keyboard" on the very device the captures came
 *           from, and the shell then became scrollable and dragged the logo card
 *           off the top. That is the bug this file now pins.
 *
 * Probes per mode: rest geometry, the settled lifted geometry, the absence of an
 * undershoot on appear, the presence of the bounce on dismiss, and that the
 * document cannot scroll while the keyboard is up.
 *
 *   node scripts/qa/check-login-keyboard.mjs
 */
import { chromium } from 'playwright'
import {
  PROFILES, SAFE_INSETS, safeInsetInitScript,
  startPreview, waitForServer, stopPreview, withRenderLock, runBuild,
} from './lib.mjs'

const PORT = 4191
const BASE = `http://localhost:${PORT}`
const REG = '202133010290'
const KB = 294 // CSS px taken by the reference device's keyboard (a360: 780 -> 486)
const KB_SCALE = 0.63

const fails = []
const rows = []
const rec = (id, probe, detail, ok) => {
  rows.push(`${id.padEnd(16)} ${probe.padEnd(14)} ${detail}`)
  if (!ok) fails.push(`${id} / ${probe}: ${detail}`)
}

/** Installs the fake visual viewport. Must run before any app script. */
const FAKE_VV = () => {
  const fake = new EventTarget()
  let h = window.innerHeight
  for (const [k, v] of [['height', () => h], ['offsetTop', () => 0], ['scale', () => 1]]) {
    Object.defineProperty(fake, k, { get: v, enumerable: true })
  }
  window.__kb = {
    // visual mode: the layout viewport is untouched, so the keyboard is the gap.
    set(v) { h = window.innerHeight - v; fake.dispatchEvent(new Event('resize')) },
    // content mode: innerHeight already shrank, so the visual viewport == it.
    content() { h = window.innerHeight; fake.dispatchEvent(new Event('resize')) },
  }
  Object.defineProperty(window, 'visualViewport', { get: () => fake, configurable: true })
}

/**
 * Samples every frame for ~600ms. The keyboard is raised inside the same task as
 * the first sample — a round trip between the two burns frames on an idle page and
 * measures nothing.
 *
 * In `visual` mode the fake viewport is the only thing that moves, so `set` does
 * both directions. In `content` mode the LAYOUT viewport moved (setViewportSize,
 * from Node) and the fake has to mirror it, which is what `content()` does — it
 * reads whatever innerHeight now is, so the same call serves up and down.
 */
const RECORD = ({ up, mode, kb }) =>
  new Promise((resolve) => {
    const out = []
    if (mode === 'content') window.__kb.content()
    else window.__kb.set(up ? kb : 0)
    const t0 = performance.now()
    const header = document.querySelector('[data-qa=header]')
    const band = document.querySelector('[data-qa=band]')
    const card = document.querySelector('[data-qa=logoCard]')
    const bar = document.querySelector('[data-qa=titleBar]')
    const form = document.querySelector('[data-qa=formCard]')
    const step = () => {
      const t = performance.now() - t0
      const r = form.getBoundingClientRect()
      out.push({
        t: Math.round(t),
        scale: Number((/matrix\(([^)]+)\)/.exec(getComputedStyle(header).transform)?.[1] ?? '1,0,0,1,0,0').split(',')[0]),
        band: Number(getComputedStyle(band).opacity),
        cardTop: Math.round(card.getBoundingClientRect().top * 10) / 10,
        barBottom: Math.round(bar.getBoundingClientRect().bottom * 10) / 10,
        formBottom: Math.round(r.bottom * 10) / 10,
        formTop: Math.round(r.top * 10) / 10,
        scrollY: Math.round(window.scrollY * 10) / 10,
        docH: document.documentElement.scrollHeight,
        innerH: window.innerHeight,
      })
      if (t < 600) requestAnimationFrame(step)
      else resolve(out)
    }
    requestAnimationFrame(step)
  })

/** The first frame already within eps of the target, or null if it never got there. */
const settleTime = (xs, key, target, eps = 0.002) => {
  const hit = xs.find((f) => Math.abs(f[key] - target) <= eps)
  return hit ? hit.t : null
}

let browser, server

await withRenderLock(async () => {
  try {
    runBuild('login-keyboard')
    server = startPreview(PORT)
    await waitForServer(BASE)
    browser = await chromium.launch()

    for (const mode of ['visual', 'content']) {
      const id = `kb/${mode}`
      const p = PROFILES.a360
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
        localStorage.setItem('webetu.lang', 'en')
        localStorage.setItem('webetu.theme', 'dark')
        localStorage.removeItem('webetu.session')
        void o
      }, {})
      await ctx.addInitScript(safeInsetInitScript, SAFE_INSETS.a360)
      await ctx.addInitScript(FAKE_VV)

      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)

      /* ---- rest state, before anything is focused ---- */
      const rest = await page.evaluate(() => {
        const g = (k) => {
          const r = document.querySelector(`[data-qa="${k}"]`).getBoundingClientRect()
          return { top: Math.round(r.top * 10) / 10, bottom: Math.round(r.bottom * 10) / 10 }
        }
        return {
          band: Number(getComputedStyle(document.querySelector('[data-qa=band]')).opacity),
          card: g('logoCard'),
          form: g('formCard'),
          docH: document.documentElement.scrollHeight,
        }
      })
      rec(id, 'rest', `band ${rest.band} card ${rest.card.top}..${rest.card.bottom} form ${rest.form.top}..${rest.form.bottom}`,
        rest.band === 1 && Math.abs(rest.card.top - 73) <= 2 && Math.abs(rest.form.bottom - 608.5) <= 2)

      await page.fill('#reg', REG)
      await page.focus('#reg')

      if (mode === 'content') {
        // Shrink the layout viewport first, exactly as an installed PWA does.
        await page.setViewportSize({ width: p.css.width, height: p.css.height - KB })
      }

      const up = await page.evaluate(RECORD, { up: true, mode, kb: KB })
      const lastUp = up[up.length - 1]

      /* ---- the lifted end state is the reference's, in both modes ---- */
      const lifted = lastUp
      rec(id, 'band-gone', `band opacity ${lifted.band} at ${lifted.t}ms (loginKeyboardActive.jpeg: no green at all)`,
        lifted.band <= 0.01)
      rec(id, 'header-scaled', `scale ${lifted.scale.toFixed(4)} (capture: card 268->158 wide, 0.586-0.65)`,
        Math.abs(lifted.scale - KB_SCALE) <= 0.005)
      rec(id, 'card-visible', `logo card top ${lifted.cardTop} in viewport 0..${lifted.innerH} (capture: 55)`,
        lifted.cardTop >= 25 && lifted.cardTop <= 60)
      // The lift is bounded by TWO rules and the smaller one wins. On this
      // viewport the header cap is the binding one, which is what the donor does:
      // public/assets/target.jpeg lifts ~124 and lets the LOGIN button tuck behind
      // the keyboard rather than clearing the whole card above it.
      rec(id, 'title-not-covered', `form top ${lifted.formTop} vs scaled title-underline bottom ${lifted.barBottom} — the card may never rise above it`,
        lifted.formTop >= lifted.barBottom - 0.5)
      rec(id, 'lift-bounded', `form bottom ${lifted.formBottom} vs visible bottom ${lifted.innerH - (mode === 'visual' ? KB : 0)} — the card tucks under the keyboard, as the donor's does`,
        lifted.formBottom >= lifted.innerH - (mode === 'visual' ? KB : 0) - 3)

      /* ---- the document must not be able to scroll the header away ---- */
      rec(id, 'no-scroll', `scrollY ${lifted.scrollY}, scrollHeight ${lifted.docH} vs innerHeight ${lifted.innerH}`,
        lifted.scrollY === 0 && lifted.docH <= lifted.innerH + 0.5)
      // The failure the user reported: the browser scrolls the focused field into
      // view and drags the PROGRES card off the top. Proved impossible by asking
      // for exactly that, with the keyboard still up.
      const forced = await page.evaluate(() => {
        document.querySelector('#pass')?.scrollIntoView({ block: 'end' })
        const r = document.querySelector('[data-qa=logoCard]').getBoundingClientRect()
        return { y: window.scrollY, top: Math.round(r.top * 10) / 10 }
      })
      rec(id, 'scroll-forced', `with the keyboard up, #pass.scrollIntoView() gave scrollY ${forced.y} and logo card top ${forced.top}`,
        forced.y === 0 && forced.top >= 25 && forced.top <= 60)

      if (mode === 'content') {
        // Restore the layout viewport before dismissing, or the hook still sees a
        // keyboard: in this mode innerHeight IS the shrunk viewport.
        await page.setViewportSize({ width: p.css.width, height: p.css.height })
      }
      const down = await page.evaluate(RECORD, { up: false, mode, kb: KB })
      const endDown = down[down.length - 1]

      /* ---- appear must not bounce, dismiss must ---- */
      const appearMin = Math.min(...up.map((f) => f.scale))
      rec(id, 'appear-clean', `lowest scale during appear ${appearMin.toFixed(4)} vs target ${KB_SCALE} — any dip below is the wobble`,
        appearMin >= KB_SCALE - 0.002)
      const settleMs = settleTime(up, 'scale', KB_SCALE)
      rec(id, 'appear-time', `reached target at ${settleMs}ms (video: 0.27s appear)`, settleMs !== null && settleMs <= 420)
      const dismissMax = Math.max(...down.map((f) => f.scale))
      rec(id, 'dismiss-bounce', `peak scale on dismiss ${dismissMax.toFixed(4)} — video measures +4.5..6% past rest`,
        dismissMax >= 1.03)
      rec(id, 'returns-home', `end scale ${endDown.scale.toFixed(4)} band ${endDown.band} form ${endDown.formTop}..${endDown.formBottom}`,
        Math.abs(endDown.scale - 1) <= 0.005 && endDown.band === 1 && Math.abs(endDown.formBottom - 608.5) <= 2)

      const unexpected = errors.filter((e) => !/favicon|manifest|Registering/i.test(e))
      rec(id, 'no-errors', unexpected.length ? unexpected.join(' | ') : 'clean', unexpected.length === 0)

      await ctx.close()
    }
  } finally {
    if (browser) await browser.close()
    stopPreview(server)
  }
}, 'check-login-keyboard')

for (const r of rows) console.log(r)
console.log(`\n${rows.length} probes · ${fails.length} failed`)
if (fails.length || rows.length === 0) {
  for (const f of fails) console.log(`  FAIL ${f}`)
  if (!rows.length) console.log('  FAIL no probes ran — this script proved nothing')
  process.exit(1)
}
console.log('OK — the keyboard lift holds in both viewport-resize modes')
