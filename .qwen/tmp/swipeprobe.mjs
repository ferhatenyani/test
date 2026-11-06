/**
 * Scratch interaction probe for the banner carousel's REVERSE swipe.
 *
 * Deferred by the parent brief (a follow-up agent owns the real carousel test),
 * but the index-moving behaviour was broken before, so this answers one
 * question: does a left-to-right drag move the index backwards at all?
 *
 * It does NOT build. It takes the same global render lock the harness uses
 * (qa/.lock) so it can never race another agent's `vite build`, serves the
 * dist/ that measure.mjs already produced, and binds its own port (4182) so it
 * cannot collide with measure.mjs's 4181.
 */
import { chromium } from 'playwright'
import { ROOT, withRenderLock, startPreview, waitForServer, stopPreview } from '../../scripts/qa/lib.mjs'

const PORT = 4182
const BASE = `http://localhost:${PORT}`

const readIndex = (page) =>
  page.evaluate(() => {
    const dots = [...document.querySelectorAll('[data-qa^=bannerDot-]')]
    return {
      active: dots.findIndex((d) => d.getAttribute('aria-current') === 'true'),
      widths: dots.map((d) => Math.round(d.getBoundingClientRect().width * 10) / 10).join('/'),
      trackX: Math.round(new DOMParser() && document.querySelector('[data-qa=bannerTrack]').getBoundingClientRect().left * 10) / 10,
    }
  })

const drag = async (page, from, to) => {
  const box = await page.getByTestId('banner-viewport').boundingBox()
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width * from, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to, y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(450)
}

let browser
const log = []
await withRenderLock(async () => {
  const server = startPreview(PORT)
  try {
    await waitForServer(BASE)
    browser = await chromium.launch()
    const ctx = await browser.newContext({
      viewport: { width: 394, height: 853 },
      deviceScaleFactor: 1.5,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'no-preference',
      serviceWorkers: 'block',
    })
    await ctx.addInitScript(() => {
      localStorage.setItem('webetu.lang', 'en')
      localStorage.setItem('webetu.theme', 'dark')
      localStorage.setItem('webetu.session', '1')
    })
    const page = await ctx.newPage()
    await page.goto(BASE + '/home', { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    const step = async (label, from, to) => {
      const before = await readIndex(page)
      await drag(page, from, to)
      const after = await readIndex(page)
      log.push(
        `${label.padEnd(34)} active ${before.active} -> ${after.active}   dotW ${after.widths}   trackLeft ${before.trackX} -> ${after.trackX}`,
      )
    }

    log.push(`start                                ${JSON.stringify(await readIndex(page))}`)
    await step('forward 1 (0.85 -> 0.15, drag L)', 0.85, 0.15)
    await step('forward 2 again (repeat gesture)', 0.85, 0.15)
    // From index 1 these actually exercise the reverse path's threshold.
    await step('BACKWARD 1 (0.15 -> 0.85, drag R)', 0.15, 0.85)
    await step('  re-forward, then BACK flick', 0.85, 0.15)
    await step('BACK flick (fast, short) from s2', 0.35, 0.55)
    await step('  re-forward, then BACK too small', 0.85, 0.15)
    await step('BACK 8% drag from s2 (below thr)', 0.4, 0.48)
    await step('  re-forward, then BACK 20%', 0.85, 0.15)
    await step('BACK 20% drag from s2', 0.4, 0.6)
    await step('BACKWARD past the start', 0.15, 0.85)
    await step('BACKWARD at start (clamped)', 0.15, 0.85)
    await ctx.close()
  } finally {
    stopPreview(server)
  }
}, 'home-swipe-probe')
if (browser) await browser.close()

console.log(log.join('\n'))
