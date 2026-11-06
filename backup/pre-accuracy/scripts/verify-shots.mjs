/**
 * Phase 6 visual verification.
 *
 * Builds are served with `vite preview`, driven by Playwright in mobile
 * emulation, and every state in the reference set is captured to qa/out/.
 * Side-by-side pairs against the original captures land in qa/compare/.
 *
 * Console errors and page errors are collected and reported — a screenshot that
 * looks right but threw is still a failure.
 */
import { chromium, devices } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'qa/out')
const CMP = path.join(ROOT, 'qa/compare')
const SHOTS = path.join(ROOT, 'screenshots')
const PORT = 4173
const BASE = `http://localhost:${PORT}`

mkdirSync(OUT, { recursive: true })
mkdirSync(CMP, { recursive: true })

const DEVICE = devices['iPhone 13']

// The login CTA's accessible name is "LOGIN" in the reference (was "Continue"),
// so match either rather than pinning the test to one piece of copy.
const LOGIN_BTN = /^(login|continue|متابعة|تسجيل الدخول)$/i

/** [name, route, { lang, theme, actions }] */
const SCENARIOS = [
  ['01-login-en-light', '/login', {}],
  ['02-login-en-light-filled', '/login', { fillLogin: true }],
  ['03-login-en-light-error', '/login', { submitEmpty: true }],
  ['04-login-ar-light', '/login', { lang: 'ar' }],
  ['05-login-ar-dark', '/login', { lang: 'ar', theme: 'dark' }],
  ['06-login-en-dark', '/login', { theme: 'dark' }],
  ['07-verify-en-light', '/login', { lang: 'en', throughLogin: true }],
  ['08-verify-ar-light', '/login', { lang: 'ar', throughLogin: true }],
  ['09-home-en-light', '/home', { session: true }],
  ['10-home-en-light-banner2', '/home', { session: true, swipeBanner: true }],
  ['11-home-ar-light', '/home', { session: true, lang: 'ar' }],
  ['12-home-en-dark', '/home', { session: true, theme: 'dark' }],
  ['13-home-ar-dark', '/home', { session: true, lang: 'ar', theme: 'dark' }],
  ['14-cards-en-light-front', '/cards', { session: true }],
  ['15-cards-en-light-back', '/cards', { session: true, flipCard: true }],
  ['16-profile-en-light', '/profile', { session: true }],
  ['17-profile-ar-light', '/profile', { session: true, lang: 'ar' }],
  ['18-profile-en-dark', '/profile', { session: true, theme: 'dark' }],
  ['19-service-sadbox', '/service/group-section', { session: true }],
  ['20-service-calx', '/service/exams-schedule', { session: true }],
  ['21-service-blank', '/service/assessment', { session: true }],
  ['22-service-chips', '/service/academic-transcripts', { session: true }],
  ['23-service-ar', '/service/discharge', { session: true, lang: 'ar' }],
]

// Which original capture each render should be judged against.
const PAIRS = {
  '01-login-en-light': 'WhatsApp Image 2026-10-25 at 18.18.55.jpeg',
  '04-login-ar-light': 'WhatsApp Image 2026-10-25 at 18.25.56 (2).jpeg',
  '05-login-ar-dark': 'WhatsApp Image 2026-10-25 at 18.25.56 (3).jpeg',
  '07-verify-en-light': 'WhatsApp Image 2026-10-25 at 18.35.12.jpeg',
  '09-home-en-light': 'WhatsApp Image 2026-10-25 at 18.26.14 (1).jpeg',
  '10-home-en-light-banner2': 'WhatsApp Image 2026-10-25 at 18.26.15.jpeg',
  '11-home-ar-light': 'WhatsApp Video 2026-10-25 at 18.56.13.mp4',
  '19-service-sadbox': 'WhatsApp Image 2026-10-25 at 18.26.05 (1).jpeg',
  '20-service-calx': 'WhatsApp Image 2026-10-25 at 18.26.05 (2).jpeg',
  '21-service-blank': 'WhatsApp Image 2026-10-25 at 18.26.05.jpeg',
  '22-service-chips': 'WhatsApp Image 2026-10-25 at 18.26.06 (1).jpeg',
}

function waitForServer(url, ms = 30000) {
  const deadline = Date.now() + ms
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
        if (res.ok || res.status === 200) return resolve()
      } catch {
        /* not up yet */
      }
      if (Date.now() > deadline) return reject(new Error(`server did not start: ${url}`))
      setTimeout(tick, 250)
    }
    tick()
  })
}

/** Drag horizontally across an element's own box — never hardcode coordinates:
 *  Playwright's iPhone 13 viewport is 390x660, so fixed y values land off-target. */
async function dragAcross(page, testId, from = 0.85, to = 0.15) {
  const box = await page.getByTestId(testId).boundingBox()
  if (!box) throw new Error(`${testId} has no bounding box`)
  const y = box.y + box.height * 0.5
  await page.mouse.move(box.x + box.width * from, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to, y, { steps: 16 })
  await page.mouse.up()
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
  detached: process.platform !== 'win32',
  shell: true,
})

function killTree(pid) {
  if (typeof pid !== 'number') return
  if (process.platform === 'win32') {
    // shell:true makes vite a grandchild; only a tree kill reaches it.
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(-pid)
  } catch {
    try {
      process.kill(pid)
    } catch {
      /* already gone */
    }
  }
}

let browser
const problems = []
try {
  await waitForServer(BASE)
  browser = await chromium.launch()

  for (const [name, route, opts] of SCENARIOS) {
    const ctx = await browser.newContext({
      ...DEVICE,
      serviceWorkers: 'block',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'no-preference',
    })

    await ctx.addInitScript((o) => {
      if (o.lang) localStorage.setItem('webetu.lang', o.lang)
      if (o.theme) localStorage.setItem('webetu.theme', o.theme)
      if (o.session) localStorage.setItem('webetu.session', '1')
    }, opts)

    const errors = []
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`)
    })

    await page.goto(BASE + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(350)

    if (opts.submitEmpty) {
      await page.getByRole('button', { name: LOGIN_BTN }).click()
      await page.waitForTimeout(450)
    }
    if (opts.fillLogin) {
      await page.fill('#reg', '2333008110')
      await page.fill('#pass', 'secret123')
      await page.waitForTimeout(250)
    }
    if (opts.throughLogin) {
      await page.fill('#reg', '2333008110')
      await page.fill('#pass', 'secret123')
      await page.getByRole('button', { name: LOGIN_BTN }).click()
      await page.waitForURL('**/verify')
      await page.waitForTimeout(400)
    }
    if (opts.swipeBanner) {
      await dragAcross(page, 'banner-viewport')
      await page.waitForTimeout(500)
    }
    if (opts.flipCard) {
      await dragAcross(page, 'card-stage')
      await page.waitForTimeout(700)
    }

    // The OTP box autofocuses and scrolls the Verify page; capture from the top
    // so the framing matches the reference captures.
    await page.evaluate(() => {
      document.activeElement?.blur?.()
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(150)

    // Viewport-sized, like the phone captures we are matching. fullPage stitches
    // a taller canvas and paints the fixed nav across the middle of it.
    await page.screenshot({ path: path.join(OUT, `${name}.png`) })

    const unexpected = errors.filter((e) => !/favicon|manifest|Registering/i.test(e))
    if (unexpected.length) {
      problems.push(`${name}: ${[...new Set(unexpected)].join(' | ')}`)
    }
    await ctx.close()
  }
} finally {
  if (browser) await browser.close()
  killTree(server.pid)
}

// Side-by-side pairs, normalised to a common height.
const H = 900
let pairsMade = 0
for (const [name, ref] of Object.entries(PAIRS)) {
  const mine = path.join(OUT, `${name}.png`)
  const theirs = path.join(SHOTS, ref)
  if (!existsSync(mine) || !existsSync(theirs) || ref.endsWith('.mp4')) continue
  const a = sharp(mine).resize({ height: H, fit: 'inside' })
  const b = sharp(theirs).resize({ height: H, fit: 'inside' })
  const [ab, bb] = await Promise.all([
    a.clone().png().toBuffer({ resolveWithObject: true }),
    b.clone().png().toBuffer({ resolveWithObject: true }),
  ])
  const gap = 16
  const W = ab.info.width + bb.info.width + gap
  const canvas = Buffer.alloc(W * H * 3, 0x11)
  const blit = (img, ox) => {
    const { data, info } = img
    const oy = Math.floor((H - info.height) / 2)
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const s = (y * info.width + x) * info.channels
        if (s + 2 >= data.length) continue
        const d = ((oy + y) * W + ox + x) * 3
        canvas[d] = data[s]
        canvas[d + 1] = data[s + 1]
        canvas[d + 2] = data[s + 2]
      }
    }
  }
  blit(ab, 0)
  blit(bb, ab.info.width + gap)
  await sharp(canvas, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toFile(path.join(CMP, `${name}.png`))
  pairsMade++
}

console.log(`captured ${SCENARIOS.length} states -> qa/out`)
console.log(`side-by-side pairs -> qa/compare (${pairsMade})`)
if (problems.length) {
  console.log(`\nRUNTIME ERRORS (${problems.length}):`)
  for (const p of problems) console.log(`  - ${p}`)
  process.exitCode = 1
} else {
  console.log('\nno runtime console/page errors')
}

// The preview server is a shell child; exit explicitly so the run cannot hang.
process.exit(process.exitCode ?? 0)
