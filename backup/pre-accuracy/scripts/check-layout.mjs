/**
 * Numeric layout assertions at phone sizes — cheaper and more precise than
 * judging overlap from a thumbnail. Reports the geometry it checked.
 */
import { chromium, devices } from 'playwright'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const PORT = 4175
const BASE = `http://localhost:${PORT}`

function waitForServer(url, ms = 30000) {
  const deadline = Date.now() + ms
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
        if (res.ok) return resolve()
      } catch {
        /* not up yet */
      }
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

const failures = []
let browser
try {
  await waitForServer(BASE)
  browser = await chromium.launch()

  for (const [label, width, height] of [
    ['iPhone 13', 390, 660],
    ['small Android', 360, 640],
    ['large Android', 412, 915],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: devices['iPhone 13'].userAgent,
    })
    await ctx.addInitScript(() => localStorage.setItem('webetu.session', '1'))
    const page = await ctx.newPage()

    // Profile: the LOGOUT button must clear the fixed bottom nav.
    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(250)
    const logout = await page.getByRole('button', { name: /logout|تسجيل الخروج/i }).boundingBox()
    const nav = await page.getByRole('navigation', { name: 'Primary' }).boundingBox()
    if (!logout || !nav) {
      failures.push(`${label}: profile logout or nav not found`)
    } else {
      const gap = nav.y - (logout.y + logout.height)
      console.log(
        `${label.padEnd(14)} profile  logout bottom=${Math.round(logout.y + logout.height)}  nav top=${Math.round(nav.y)}  clearance=${Math.round(gap)}px`,
      )
      if (gap < 8) failures.push(`${label}: LOGOUT overlaps the nav (clearance ${Math.round(gap)}px)`)
    }

    // Home: no horizontal overflow, and the grid keeps two columns.
    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    const cols = await page.locator('.grid > a').first().evaluate((el) => {
      const y = el.getBoundingClientRect().y
      const row = [...document.querySelectorAll('.grid > a')].filter(
        (n) => Math.abs(n.getBoundingClientRect().y - y) < 2,
      )
      return row.length
    })
    console.log(`${label.padEnd(14)} home     hOverflow=${overflow}px  tilesInFirstRow=${cols}`)
    if (overflow > 0) failures.push(`${label}: horizontal overflow ${overflow}px`)
    if (cols !== 2) failures.push(`${label}: first tile row has ${cols} columns, expected 2`)

    // Arabic: mirrored, and the nav still starts with Home on the left.
    await page.addInitScript(() => localStorage.setItem('webetu.lang', 'ar'))
    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
    const dir = await page.evaluate(() => document.documentElement.dir)
    const firstNav = await page.locator('nav a').first().boundingBox()
    const navBox = await page.getByRole('navigation', { name: 'Primary' }).boundingBox()
    const homeOnLeft = firstNav.x - navBox.x < navBox.width / 3
    console.log(`${label.padEnd(14)} arabic   dir=${dir}  navFirstItemOnLeft=${homeOnLeft}`)
    if (dir !== 'rtl') failures.push(`${label}: Arabic did not set dir=rtl`)
    if (!homeOnLeft) failures.push(`${label}: Arabic nav no longer starts on the left`)

    await ctx.close()
  }
} finally {
  if (browser) await browser.close()
  // shell:true makes vite a grandchild; wait for the tree kill or the run hangs.
  spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
}

if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`)
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('\nall layout assertions passed')
process.exit(0)
