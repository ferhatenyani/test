// PWA installability probe: serves dist/, asks Chrome itself why it will not offer install.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = path.resolve('dist')
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}
// allow override so we can test what a wrong content-type does
const BAD_MANIFEST_MIME = process.argv.includes('--bad-manifest-mime')

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0])
  let file = path.join(ROOT, rel)
  if (!path.extname(file)) file = path.join(ROOT, 'index.html')
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404)
      res.end('not found')
      return
    }
    const ext = path.extname(file).toLowerCase()
    let type = MIME[ext] || 'application/octet-stream'
    if (BAD_MANIFEST_MIME && ext === '.webmanifest') type = 'application/octet-stream'
    res.writeHead(200, { 'content-type': type })
    res.end(buf)
  })
})

await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`
console.log('serving dist/ at', origin, BAD_MANIFEST_MIME ? '(manifest: application/octet-stream)' : '(manifest: application/manifest+json)')

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

const bips = []
await page.addInitScript(() => {
  window.__bip = []
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    window.__bip.push(e.platform?.map((p) => p.name) ?? 'no-platforms')
  })
})
const swConsole = []
page.on('console', (m) => {
  if (/serviceworker|manifest|install/i.test(m.text())) swConsole.push(`[${m.type()}] ${m.text()}`)
})

await page.goto(`${origin}/`, { waitUntil: 'networkidle' })

// 1. What does Chrome's own manifest parser say?
const cdp = await ctx.newCDPSession(page)
const manifest = await cdp.send('Page.getAppManifest', { url: `${origin}/` })
console.log('\n--- Page.getAppManifest ---')
console.log('manifest url:', manifest.url)
console.log('parse errors:', JSON.stringify(manifest.errors))
console.log('security issues:', JSON.stringify(manifest.security_errors ?? []))
console.log('id:', manifest.id, '| name:', manifest.name, '| short_name:', manifest.short_name)
console.log('start_url:', manifest.start_url, '| scope:', manifest.scope ?? '(absent)', '| display:', manifest.display)
console.log('icons:', JSON.stringify(manifest.icons, null, 1))

// 2. Chrome's installability failure list
const { errors } = await cdp.send('Page.getInstallabilityErrors')
console.log('\n--- Page.getInstallabilityErrors ---')
console.log(errors.length ? JSON.stringify(errors, null, 1) : '(none — Chrome considers it installable)')

// 3. Service worker actually registered? fetch handler present?
const sw = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations()
  return regs.map((r) => ({
    scope: r.scope,
    active: r.active?.scriptURL ?? null,
    waiting: !!r.waiting,
    controllerOnPage: !!navigator.serviceWorker.controller,
  }))
})
console.log('\n--- service worker ---')
console.log(JSON.stringify(sw, null, 1))

// 4. Does the SW file itself wire up a fetch handler? (workbox does)
const swText = await page.evaluate((u) => fetch(u).then((r) => r.text()), `${origin}/sw.js`)
console.log('sw.js bytes:', swText.length, '| contains fetch handler:', /fetch|NavigationRoute|createHandler|registerRoute/.test(swText))

// 5. fetch() the manifest the way the browser does
const man = await page.evaluate(async (u) => {
  const r = await fetch(u)
  return { status: r.status, contentType: r.headers.get('content-type'), body: await r.text() }
}, `${origin}/manifest.webmanifest`)
console.log('\n--- manifest.webmanifest fetch ---')
console.log('status:', man.status, '| content-type:', man.contentType)

await page.waitForTimeout(2500)
const fired = await page.evaluate(() => window.__bip)
console.log('\n--- beforeinstallprompt ---')
console.log(fired.length ? `FIRED ${fired.length}x, platforms ${JSON.stringify(fired)}` : 'did NOT fire')
if (swConsole.length) console.log('\nrelated console:\n' + swConsole.join('\n'))

await browser.close()
server.close()
