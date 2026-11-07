/**
 * §8.2 — Cards tap-to-rotate, MEASURED.
 *
 * The card rotates with `rotateY`, so a single DOMMatrix read is useless twice
 * over: it cannot tell 0 from 360, and it cannot report the accumulated sign of a
 * flip that already settled. So every gesture is sampled per animation frame and
 * the shortest signed delta between samples is accumulated — that sum IS the
 * travel, with its direction, and the count of distinct angles it passed through
 * is what separates a ramp (animated) from a step (jumped).
 *
 * Asserts per gesture: signed total = ±180, sign matches the half tapped, it
 * ramped through >= 10 distinct angles, and the resting face is the expected one.
 * Covers right, right (360 = front again), left, left (0), a repeat round-trip,
 * a real swipe forward and back to prove the drag path still commits, and a tap
 * issued mid-animation to prove isAnimatingRef still rejects it.
 *
 * Runs both themes x both languages. Exits 1 with a list on any failure and never
 * exits 0 without having probed something.
 *
 *   node scripts/qa/check-cards-tap.mjs
 */
import { chromium } from 'playwright'
import { PROFILES, SAFE_INSETS, safeInsetInitScript, startPreview, waitForServer, stopPreview, withRenderLock, runBuild } from './lib.mjs'

const PORT = 4189
const BASE = `http://localhost:${PORT}`
const CARD = '[data-testid="card"]'
const TOL = 8 // degrees of slack on a ±180 target — absorbs the spring tail

const fails = []
const rows = []
const rec = (id, probe, detail, ok) => {
  rows.push(`${id.padEnd(12)} ${probe.padEnd(14)} ${detail}`)
  if (!ok) fails.push(`${id} / ${probe}: ${detail}`)
}

/**
 * rotateY(θ) as a column-major matrix3d puts cosθ at m11 and **-sinθ** at m13, so
 * atan2 must be negated or every measured travel comes out with the opposite sign
 * to the rotation the code actually committed. Calibrated against the known-good
 * drag path: a rightward swipe commits +180, so the readout must say +180.
 */
const startRotationProbe = (page, frames = 90) =>
  page.evaluate(
    ({ selector, frames }) =>
      new Promise((resolve) => {
        const out = []
        let n = 0
        const step = () => {
          const el = document.querySelector(selector)
          let deg = NaN
          if (el) {
            const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
            deg = (Math.atan2(-m.m13, m.m11) * 180) / Math.PI
          }
          out.push(deg)
          if (++n < frames) requestAnimationFrame(step)
          else resolve(out)
        }
        requestAnimationFrame(step)
      }),
    { selector: CARD, frames },
  )

/** Sum of shortest signed deltas — the unwrapped travel through the seam. */
const travel = (degs) => {
  const v = degs.filter((d) => Number.isFinite(d))
  let sum = 0
  for (let i = 1; i < v.length; i++) {
    let d = v[i] - v[i - 1]
    while (d > 180) d -= 360
    while (d < -180) d += 360
    sum += d
  }
  return sum
}

const distinctAngles = (degs) =>
  new Set(degs.filter((d) => Number.isFinite(d)).map((d) => Math.round(d * 2))).size

/** Settled face: 0 (or ±360) shows the front, ±180 shows the back. */
const faceOf = (degs) => {
  const v = degs.filter((d) => Number.isFinite(d))
  if (!v.length) return 'none'
  const last = ((v[v.length - 1] % 360) + 360) % 360
  return last > 90 && last < 270 ? 'back' : 'front'
}

let browser, server

await withRenderLock(async () => {
  try {
    runBuild('cards-tap')
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
        await page.goto(`${BASE}/cards`, { waitUntil: 'networkidle' })
        await page.waitForSelector(CARD, { timeout: 8000 })
        await page.waitForTimeout(400)

        const box = await page.locator(CARD).boundingBox()
        if (!box) {
          rec(id, 'setup', 'no card bounding box — nothing probed', false)
          await ctx.close()
          continue
        }
        const cy = box.y + box.height / 2
        const rightX = box.x + box.width * 0.75
        const leftX = box.x + box.width * 0.25

        /** One tap, sampled from the frame it starts on. */
        const tap = async (x, label, wantSign, wantFace) => {
          const probe = startRotationProbe(page)
          await page.mouse.click(x, cy)
          const degs = await probe
          const t = travel(degs)
          const steps = distinctAngles(degs)
          const face = faceOf(degs)
          rec(
            id,
            `tap-${label}`,
            `travel ${t.toFixed(1)}° over ${steps} distinct angle(s), rests ${face}`,
            Math.abs(Math.abs(t) - 180) <= TOL && Math.sign(t) === wantSign && steps >= 10 && face === wantFace,
          )
          await page.waitForTimeout(350)
        }

        // Full cycle: right, right (360 = front again), left, left (0).
        await tap(rightX, 'right-1', +1, 'back')
        await tap(rightX, 'right-2', +1, 'front')
        await tap(leftX, 'left-1', -1, 'back')
        await tap(leftX, 'left-2', -1, 'front')

        // Repeat round-trip — catches a gesture that only works once.
        await tap(rightX, 'again-r', +1, 'back')
        await tap(leftX, 'again-l', -1, 'front')

        /* ---- a real swipe must still commit both ways ---- */
        const swipe = async (fromX, toX, label, wantSign, wantFace) => {
          const probe = startRotationProbe(page)
          await page.mouse.move(fromX, cy)
          await page.mouse.down()
          await page.mouse.move(toX, cy, { steps: 8 })
          await page.mouse.up()
          const degs = await probe
          const t = travel(degs)
          const steps = distinctAngles(degs)
          const face = faceOf(degs)
          rec(
            id,
            `swipe-${label}`,
            `travel ${t.toFixed(1)}° over ${steps} distinct angle(s), rests ${face}`,
            Math.abs(Math.abs(t) - 180) <= TOL && Math.sign(t) === wantSign && face === wantFace,
          )
          await page.waitForTimeout(350)
        }

        // 120 CSS px at dragSensitivity 180/360 = 60° — past SNAP_THRESHOLD 45.
        await swipe(box.x + box.width / 2, box.x + box.width / 2 + 120, 'fwd', +1, 'back')
        await swipe(box.x + box.width / 2, box.x + box.width / 2 - 120, 'back', -1, 'front')

        /* ---- a tap during an animation is rejected, not queued ---- */
        const busyProbe = startRotationProbe(page)
        await page.mouse.click(rightX, cy)
        await page.mouse.click(rightX, cy) // lands while isAnimatingRef is true
        const busy = await busyProbe
        const busyTravel = travel(busy)
        rec(
          id,
          'tap-mid-flip',
          `two taps back to back travelled ${busyTravel.toFixed(1)}° (one flip = 180, two = 360)`,
          Math.abs(Math.abs(busyTravel) - 180) <= TOL,
        )
        await page.waitForTimeout(400)

        /* ---- a sub-dead-zone drag is still a tap, not a no-op ---- */
        const tinyProbe = startRotationProbe(page)
        await page.mouse.move(rightX, cy)
        await page.mouse.down()
        await page.mouse.move(rightX + 5, cy) // 5 < DEAD_ZONE 10
        await page.mouse.up()
        const tiny = travel(await tinyProbe)
        rec(
          id,
          'drag-in-deadzone',
          `6px drag travelled ${tiny.toFixed(1)}° (a tap must still flip)`,
          Math.abs(Math.abs(tiny) - 180) <= TOL,
        )
        await page.waitForTimeout(350)

        /* ---- a real drag past the dead zone but short of the snap returns ---- */
        const shortProbe = startRotationProbe(page)
        await page.mouse.move(box.x + box.width / 2, cy)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2 + 40, cy, { steps: 6 }) // 20° < 45°
        await page.mouse.up()
        const shortT = travel(await shortProbe)
        rec(
          id,
          'drag-below-snap',
          `40px drag travelled ${shortT.toFixed(1)}° (must snap back to 0)`,
          Math.abs(shortT) <= TOL,
        )

        await ctx.close()
      }
    }
  } finally {
    if (browser) await browser.close()
    stopPreview(server)
  }
}, 'check-cards-tap')

for (const r of rows) console.log(r)
console.log(`\n${rows.length} probes · ${fails.length} failed`)
if (fails.length || rows.length === 0) {
  for (const f of fails) console.log(`  FAIL ${f}`)
  if (!rows.length) console.log('  FAIL no probes ran — this script proved nothing')
  process.exit(1)
}
console.log('OK — every tap and swipe measured a real ±180 rotation')
