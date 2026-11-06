/**
 * PHASE 4b — the 2FA code entry, MEASURED as behaviour, not as markup.
 *
 * OtpInput.jsx implements five input behaviours and Verify.jsx gates its CTA on
 * the sixth. A static render cannot see any of them, and a DOM assertion ("the
 * onChange prop exists") proves nothing about what the boxes do. So every probe
 * here drives the real page in a real browser and prints the digit string and
 * focus index that came out after each keystroke.
 *
 * Probes, per theme x language:
 *   mount       six boxes, 46x54 CSS, x ASCENDING, box 0 autofocused
 *   advance     one press -> one box forward, six times
 *   backspace   clears a filled box, then walks backwards clearing each
 *   non-digit   letters typed between digits are dropped, focus still advances
 *   paste       6 digits in one gesture, and a paste of junk keeps only digits
 *   pasteBtn    the "paste code" control fills from the clipboard (separate path)
 *   cta paint   flat brand fill appears at EXACTLY 6 digits, gradient below it
 *   cta gate    click at 5 = error state, no navigation; click at 6 = /home
 *
 * Assertions are GEOMETRY AND STATE ONLY. No copy string is matched anywhere,
 * because a UI copy edit would make a string-matching suite go stale and read
 * green while testing nothing. The CTA "enabled" test is therefore behavioural:
 * the button is never disabled, so what is measured is its paint flipping at 6
 * and a click at 5 refusing to leave the page.
 *
 * NOTE on paste: Playwright's documented recipe is writeText + Control+V. If
 * headless Chromium does not deliver a native paste, the probe falls back to a
 * synthetic ClipboardEvent, which exercises the component handler but not the
 * browser integration — the detail line says which one fired (`via=`).
 *
 *   node scripts/qa/check-verify-input.mjs
 */
import { chromium } from 'playwright'
import {
  PROFILES, startPreview, waitForServer, stopPreview, withRenderLock, runBuild,
} from './lib.mjs'

const PORT = 4191
const BASE = `http://localhost:${PORT}`
const N = 6

const fails = []
const rows = []
const rec = (id, probe, detail, ok) => {
  rows.push(`${id.padEnd(12)} ${probe.padEnd(16)} ${detail}`)
  if (!ok) fails.push(`${id} / ${probe}: ${detail}`)
}

const r1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : NaN)

/**
 * One read of the whole widget as numbers. `filled` is the digit string in BOX
 * INDEX order, and `xs` is the geometry, so the two together catch a mirrored
 * row (same string, descending x) that a value-only probe would miss.
 */
const readOtp = (page) =>
  page.evaluate(
    ({ n }) => {
      const boxes = []
      for (let i = 0; i < n; i++) {
        const el = document.querySelector(`[data-qa="otp${i}"]`)
        if (!el) {
          boxes.push(null)
          continue
        }
        const b = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        boxes.push({
          x: Math.round(b.x * 10) / 10,
          w: Math.round(b.width * 10) / 10,
          h: Math.round(b.height * 10) / 10,
          value: el.value,
          focused: document.activeElement === el,
          border: cs.borderColor,
          borderWidth: cs.borderTopWidth,
          radius: cs.borderTopLeftRadius,
        })
      }
      const cta = document.querySelector('[data-qa="cta"]')
      const ccs = cta ? getComputedStyle(cta) : null
      const cb = cta ? cta.getBoundingClientRect() : null
      const err = document.querySelector('[data-qa="otpError"]')
      const filled = boxes.map((b) => (b ? b.value : '·')).join('')
      return {
        boxes,
        filled,
        count: filled.replace(/[·]/g, '').length,
        focusIndex: boxes.findIndex((b) => b && b.focused),
        xs: boxes.map((b) => (b ? b.x : NaN)),
        cta: cta
          ? {
              h: Math.round(cb.height * 10) / 10,
              disabled: !!cta.disabled,
              bgColor: ccs.backgroundColor,
              gradient: /gradient\(/i.test(ccs.backgroundImage),
              img: ccs.backgroundImage.slice(0, 60),
            }
          : null,
        errH: err ? Math.round(err.getBoundingClientRect().height * 10) / 10 : null,
      }
    },
    { n: N },
  )

/** Chain of "digits:box" per step, so a failure names the exact keystroke. */
const stepTag = (s) => `'${s.filled}'@${s.focusIndex}`

const isReddish = (rgb) => {
  const m = String(rgb).match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (!m) return false
  const [r, g, b] = [+m[1], +m[2], +m[3]]
  return r > g + 24 && r > b + 24
}

/** Clipboard write; returns false instead of throwing when the API refuses. */
const writeClip = (page, text) =>
  page.evaluate((t) => navigator.clipboard.writeText(t).then(() => true, () => false), text)

/** Synthetic paste dispatch as the fallback path; returns whether it was sent. */
const syntheticPaste = (page, text) =>
  page.evaluate(
    (t) => {
      const el = document.activeElement
      if (!el || el.tagName !== 'INPUT') return false
      const dt = new DataTransfer()
      dt.setData('text/plain', t)
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
      return true
    },
    text,
  )

/**
 * Keyboard paste first (real browser integration), then synthetic. Returns
 * {state, via} so the log states which mechanism produced the result.
 */
async function pasteIntoBox0(page, text) {
  const ok = await writeClip(page, text)
  await page.locator('[data-qa="otp0"]').focus()
  await page.waitForTimeout(120)
  if (ok) {
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(180)
    let s = await readOtp(page)
    if (s.filled.replace(/[·]/g, '').length) return { s, via: 'ctrl+v' }
  }
  await syntheticPaste(page, text)
  await page.waitForTimeout(180)
  return { s: await readOtp(page), via: ok ? 'synthetic-fallback' : 'synthetic(no-clipboard)' }
}

/**
 * Empty the row. Backspace at box 0 is a no-op by design (`i > 0` guards it), so
 * clearing from the left never converges — walk focus to the LAST box with the
 * component's own ArrowRight, then let Backspace delete-and-walk-backwards,
 * which is the behaviour under test anyway.
 */
async function clearAll(page) {
  await page.locator('[data-qa="otp0"]').focus()
  await page.waitForTimeout(100)
  for (let i = 0; i < N - 1; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(60)
  }
  let s = await readOtp(page)
  let guard = 0
  while (s.count && guard++ < 12) {
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(90)
    s = await readOtp(page)
  }
  return s
}

let browser, server

await withRenderLock(async () => {
  try {
    runBuild('verify-input')
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
        await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
        await ctx.addInitScript(
          (o) => {
            localStorage.setItem('webetu.lang', o.lang)
            localStorage.setItem('webetu.theme', o.theme)
            localStorage.removeItem('webetu.session')
          },
          { lang, theme },
        )
        const page = await ctx.newPage()
        await page.goto(`${BASE}/verify`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(700) // the push-enter tween moves the whole sheet
        await page.bringToFront()

        /* ---- mount: six boxes, real size, LTR order, box 0 focused ---- */
        const m = await readOtp(page)
        const sizes = m.boxes.every((b) => b && Math.abs(b.w - 46) <= 1 && Math.abs(b.h - 54) <= 1)
        const ascending = m.xs.every((x, i) => i === 0 || x > m.xs[i - 1])
        const gaps = m.xs.slice(1).map((x, i) => r1(x - m.xs[i] - m.boxes[i].w))
        rec(
          id,
          'mount',
          `boxes ${m.boxes.map((b) => (b ? `${b.w}x${b.h}` : 'na')).join(' ')} | gap ${gaps.join(' ')} | x ${m.xs.join(' ')} ascending=${ascending} | focus ${m.focusIndex} | filled '${m.filled}'`,
          m.boxes.every(Boolean) && sizes && ascending && m.focusIndex === 0 && m.count === 0,
        )
        rec(
          id,
          'no-mirror',
          `box0 x ${m.xs[0]} -> box5 x ${m.xs[5]} (dir=${lang === 'ar' ? 'rtl page' : 'ltr page'}, row must stay ltr)`,
          ascending && r1(m.xs[5] - m.xs[0]) > 200,
        )

        /* ---- per-digit focus advance ---- */
        let before = m
        for (let i = 0; i < N; i++) {
          await page.keyboard.press(String(i + 1))
          await page.waitForTimeout(120)
          const s = await readOtp(page)
          const expectFilled = Array.from({ length: i + 1 }, (_, k) => String(k + 1)).join('')
          const expectFocus = i < N - 1 ? i + 1 : i
          rec(
            id,
            `advance ${i + 1}`,
            `${stepTag(before)} -> ${stepTag(s)} | want '${expectFilled}'@${expectFocus}`,
            s.filled === expectFilled && s.focusIndex === expectFocus,
          )
          before = s
        }

        /* ---- backspace: clears the filled box, then walks back ---- */
        let prev = await readOtp(page)
        for (let step = 1; step <= N; step++) {
          await page.keyboard.press('Backspace')
          await page.waitForTimeout(120)
          const s = await readOtp(page)
          const expectFilled = String(Array.from({ length: N - step }, (_, k) => k + 1).join(''))
          const expectFocus = step === 1 ? N - 1 : N - 1 - (step - 1)
          rec(
            id,
            `backspace ${step}`,
            `${stepTag(prev)} -> ${stepTag(s)} | want '${expectFilled}'@${expectFocus}`,
            s.filled === expectFilled && s.focusIndex === expectFocus,
          )
          prev = s
        }
        {
          const s = await readOtp(page)
          rec(
            id,
            'backspace clears',
            `after ${N} presses: ${stepTag(s)} (want ''@0) | all boxes empty=${s.boxes.every((b) => b && b.value === '')}`,
            s.count === 0 && s.focusIndex === 0,
          )
        }

        /* ---- non-digit rejection, letters interleaved with digits ---- */
        await page.locator('[data-qa="otp0"]').focus()
        await page.waitForTimeout(100)
        const junk = ['a', '1', 'b', '2', 'c', '3', '-', '4']
        for (const ch of junk) {
          await page.keyboard.press(ch === '-' ? 'Minus' : ch.toUpperCase())
          await page.waitForTimeout(110)
        }
        {
          const s = await readOtp(page)
          rec(
            id,
            'non-digit drop',
            `typed ${junk.join('')} -> ${stepTag(s)} | want '1234'@4`,
            s.filled === '1234' && s.focusIndex === 4,
          )
        }
        const cleared = await clearAll(page)
        rec(id, 'clear-to-empty', `${stepTag(cleared)} (want ''@0)`, cleared.count === 0 && cleared.focusIndex === 0)

        /* ---- 6-digit paste in one gesture ---- */
        const p6 = await pasteIntoBox0(page, '246813')
        rec(
          id,
          'paste 6',
          `via ${p6.via} -> ${stepTag(p6.s)} | want '246813'@5 | radius ${p6.s.boxes[0].radius} border ${p6.s.boxes[0].borderWidth}`,
          p6.s.filled === '246813' && p6.s.focusIndex === 5,
        )

        /* ---- paste with junk: only digits survive, capped at 6 ---- */
        await clearAll(page)
        const pj = await pasteIntoBox0(page, 'a1-2b3 45z678')
        rec(
          id,
          'paste junk',
          `via ${pj.via} 'a1-2b3 45z678' -> ${stepTag(pj.s)} | want '123456'@5`,
          pj.s.filled === '123456' && pj.s.count === 6 && pj.s.focusIndex === 5,
        )

        /* ---- the "paste code" control is a different code path (readText) ---- */
        await clearAll(page)
        const clipOk = await writeClip(page, '135790')
        await page.locator('[data-qa="pasteBtn"]').click()
        await page.waitForTimeout(250)
        {
          const s = await readOtp(page)
          rec(
            id,
            'pasteBtn',
            `clipboard write ok=${clipOk} -> ${stepTag(s)} | want '135790'@?`,
            clipOk ? s.filled === '135790' : s.count === 0,
          )
        }

        /* ---- CTA paint must flip at EXACTLY 6 digits ---- */
        const paints = []
        await clearAll(page)
        for (let i = 1; i <= N; i++) {
          await page.keyboard.press(String(i))
          await page.waitForTimeout(110)
          const s = await readOtp(page)
          paints.push({ len: s.count, gradient: s.cta.gradient, bgColor: s.cta.bgColor, disabled: s.cta.disabled })
          const wantGradient = s.count < N
          rec(
            id,
            `cta paint @${s.count}`,
            `gradient=${s.cta.gradient} (want ${wantGradient}) bg ${s.cta.bgColor} disabled=${s.cta.disabled} h ${s.cta.h}`,
            s.cta.gradient === wantGradient && s.cta.disabled === false,
          )
        }
        const flips = paints.slice(1).map((p, i) => (p.gradient === paints[i].gradient ? 0 : 1)).reduce((a, b) => a + b, 0)
        rec(
          id,
          'cta one flip',
          `transitions at len ${paints.map((p) => `${p.len}:${p.gradient ? 'G' : 'flat'}`).join(' ')} | flips ${flips} (want 1, at 6)`,
          flips === 1 && paints[N - 1].gradient === false,
        )

        /* ---- CTA gate: 5 digits must NOT navigate, and must show error state ---- */
        await clearAll(page)
        for (let i = 1; i <= 5; i++) {
          await page.keyboard.press(String(i))
          await page.waitForTimeout(110)
        }
        const idle = await readOtp(page)
        await page.locator('[data-qa="cta"]').click()
        await page.waitForTimeout(350)
        {
          const s = await readOtp(page)
          const borderChanged = s.boxes[0].border !== idle.boxes[0].border
          rec(
            id,
            'gate @5',
            `url ${page.url().replace(BASE, '')} | filled ${stepTag(s)} | errH ${s.errH} | box border ${idle.boxes[0].border} -> ${s.boxes[0].border} (reddish=${isReddish(s.boxes[0].border)}) w ${s.boxes[0].borderWidth}`,
            /\/verify$/.test(page.url()) && s.count === 5 && s.errH > 4 && borderChanged && isReddish(s.boxes[0].border),
          )
        }

        /* ---- the 6th digit must clear the error and complete the code ----
           The CTA holds focus after being clicked, so a bare press('6') would
           type into the button. Five digits leave focus on box 5 (empty), which
           is re-targeted explicitly here. */
        await page.locator('[data-qa="otp5"]').focus()
        await page.waitForTimeout(120)
        await page.keyboard.press('6')
        await page.waitForTimeout(300)
        {
          const s = await readOtp(page)
          rec(
            id,
            'error clears @6',
            `${stepTag(s)} | errH ${s.errH} (want null) | gradient=${s.cta.gradient} border ${s.boxes[0].border}`,
            s.filled === '123456' && s.errH === null && s.cta.gradient === false,
          )
        }

        /* ---- completing the code and confirming leaves the page ---- */
        await page.locator('[data-qa="cta"]').click()
        await page.waitForURL('**/home', { timeout: 8000 }).catch(() => {})
        {
          const url = page.url().replace(BASE, '')
          rec(id, 'confirm @6', `url ${url} (want /home)`, /\/home$/.test(url))
        }

        await ctx.close()
      }
    }
  } finally {
    if (browser) await browser.close()
    stopPreview(server)
  }
}, 'check-verify-input')

for (const r of rows) console.log(r)
console.log(`\n${rows.length} probes · ${fails.length} failed`)
if (fails.length || rows.length === 0) {
  for (const f of fails) console.log(`  FAIL ${f}`)
  if (!rows.length) console.log('  FAIL no probes ran — this script proved nothing')
  process.exit(1)
}
console.log('OK — advance, backspace walk, digit-only paste, and the 6-digit CTA gate all measured real state')
