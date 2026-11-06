/**
 * Numeric proof for the two carousel claims:
 *   1. consecutive swipes in BOTH directions keep working (was: stuck after 1st)
 *   2. banners are not cropped in dark mode (rendered aspect == natural aspect)
 * Reports the observed track offset and dot state at every step.
 */
import { chromium, devices } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const PORT = 4177
const BASE = `http://localhost:${PORT}`

function waitForServer(url, ms = 30000) {
  const deadline = Date.now() + ms
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(1000) })
        if (r.ok) return resolve()
      } catch {}
      if (Date.now() > deadline) return reject(new Error('server did not start'))
      setTimeout(tick, 250)
    }
    tick()
  })
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
  shell: true,
})

const fails = []

async function swipe(page, direction) {
  const box = await page.getByTestId('banner-viewport').boundingBox()
  const y = box.y + box.height / 2
  const from = direction === 'left' ? box.x + box.width * 0.85 : box.x + box.width * 0.15
  const to = direction === 'left' ? box.x + box.width * 0.15 : box.x + box.width * 0.85
  await page.mouse.move(from, y)
  await page.mouse.down()
  await page.mouse.move(to, y, { steps: 14 })
  await page.mouse.up()
  await page.waitForTimeout(420)
}

async function state(page) {
  return page.evaluate(() => {
    const vp = document.querySelector('[data-testid="banner-viewport"]')
    const track = vp.firstElementChild
    const m = new DOMMatrixReadOnly(getComputedStyle(track).transform)
    const active = [...document.querySelectorAll('[data-testid^="banner-dot-"]')].findIndex(
      (d) => d.getAttribute('aria-current') === 'true',
    )
    const img = track.querySelector('img')
    const r = img.getBoundingClientRect()
    return {
      offset: Math.round(m.m41),
      dot: active,
      vpWidth: Math.round(vp.clientWidth),
      renderedAspect: +(r.width / r.height).toFixed(3),
      naturalAspect: +(img.naturalWidth / img.naturalHeight).toFixed(3),
    }
  })
}

let browser
try {
  await waitForServer(BASE)
  browser = await chromium.launch()

  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({
      ...devices['iPhone 13'],
      serviceWorkers: 'block',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    await ctx.addInitScript((t) => {
      localStorage.setItem('webetu.session', '1')
      localStorage.setItem('webetu.theme', t)
    }, theme)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    console.log(`\n--- ${theme} ---`)
    const s0 = await state(page)
    console.log(`start      dot=${s0.dot} offset=${s0.offset} vp=${s0.vpWidth}`)
    if (s0.dot !== 0) fails.push(`${theme}: did not start on slide 0`)

    // Forward: 0 -> 1, then clamped at 1.
    await swipe(page, 'left')
    const s1 = await state(page)
    console.log(`swipe L #1 dot=${s1.dot} offset=${s1.offset}`)
    if (s1.dot !== 1) fails.push(`${theme}: first swipe did not reach slide 1`)
    if (Math.abs(s1.offset + s1.vpWidth) > 2)
      fails.push(`${theme}: track not parked at -viewport width (${s1.offset})`)

    await swipe(page, 'left')
    const s2 = await state(page)
    console.log(`swipe L #2 dot=${s2.dot} offset=${s2.offset} (clamped)`)
    if (s2.dot !== 1) fails.push(`${theme}: over-swipe left should clamp at slide 1, got ${s2.dot}`)

    // Backward: 1 -> 0, then clamped at 0.
    await swipe(page, 'right')
    const s3 = await state(page)
    console.log(`swipe R #1 dot=${s3.dot} offset=${s3.offset}`)
    if (s3.dot !== 0) fails.push(`${theme}: swipe right did not return to slide 0 (STUCK BUG)`)

    await swipe(page, 'right')
    const s4 = await state(page)
    console.log(`swipe R #2 dot=${s4.dot} offset=${s4.offset} (clamped)`)
    if (s4.dot !== 0) fails.push(`${theme}: over-swipe right should clamp at slide 0`)

    // Round trip again to prove it is not a one-shot.
    await swipe(page, 'left')
    const s5 = await state(page)
    console.log(`swipe L #3 dot=${s5.dot} offset=${s5.offset} (round trip)`)
    if (s5.dot !== 1) fails.push(`${theme}: carousel stuck after a round trip`)

    // Crop check: rendered aspect must equal the image's natural aspect.
    const drift = Math.abs(s5.renderedAspect - s5.naturalAspect)
    console.log(`aspect     rendered=${s5.renderedAspect} natural=${s5.naturalAspect} drift=${drift.toFixed(3)}`)
    if (drift > 0.02) fails.push(`${theme}: banner is being cropped (aspect drift ${drift.toFixed(3)})`)

    await ctx.close()
  }
} finally {
  if (browser) await browser.close()
  spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
}

if (fails.length) {
  console.log(`\nFAILURES (${fails.length}):`)
  for (const f of fails) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('\ncarousel scrolls repeatedly in both directions; banners uncropped')
process.exit(0)
