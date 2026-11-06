// PWA installability probe. Compare a secure context (127.0.0.1) with a LAN IP
// (the origin a phone reaches with `vite --host`), on the exact same dist/ build.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { chromium } from 'playwright'

const ROOT = path.resolve('dist')
const BIND = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1'
const USE_LAN_ORIGIN = process.argv.includes('--lan')
const BAD_MANIFEST_MIME = process.argv.includes('--bad-manifest-mime')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': BAD_MANIFEST_MIME ? 'application/octet-stream' : 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
}

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0])
  let file = path.join(ROOT, rel)
  if (!path.extname(file)) file = path.join(ROOT, 'index.html')
  fs.readFile(file, (err, buf) => {
    if (err) return res.writeHead(404, { 'content-type': 'text/plain' }) + res.end('nf')
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' })
    res.end(buf)
  })
})

await new Promise((r) => server.listen(0, BIND, r))
const port = server.address().port
const host = USE_LAN_ORIGIN ? lanIp() : '127.0.0.1'
const origin = `http://${host}:${port}`
console.log(`\n=== ${USE_LAN_ORIGIN ? 'LAN IP (non-secure, = what the phone sees)' : '127.0.0.1 (secure context)'} ===`)
console.log('serving dist/ at', origin, BAD_MANIFEST_MIME ? '| manifest served as application/octet-stream' : '')

function lanIp() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal && a.address.startsWith('10.')) return a.address
    }
  }
  return host
}

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()
await page.addInitScript(() => {
  window.__bip = []
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    window.__bip.push(e.platforms?.map((p) => p.platform) ?? [])
  })
})
const warnings = []
page.on('console', (m) => {
  const t = m.text()
  if (/manifest|service ?worker|install|isolated|secure/i.test(t)) warnings.push(`[${m.type()}] ${t}`)
})

await page.goto(`${origin}/`, { waitUntil: 'networkidle' }).catch((e) => console.log('nav error:', e.message))

const cdp = await ctx.newCDPSession(page)
const dump = (label, obj) => console.log(`\n--- ${label} ---\n${JSON.stringify(obj, null, 1).slice(0, 2600)}`)
try {
  dump('Page.getAppManifest', await cdp.send('Page.getAppManifest', { url: `${origin}/` }))
} catch (e) {
  console.log('getAppManifest failed:', e.message)
}
try {
  dump('Page.getInstallabilityErrors', await cdp.send('Page.getInstallabilityErrors'))
} catch (e) {
  console.log('getInstallabilityErrors failed:', e.message)
}

const flags = await page.evaluate(() => ({
  secureContext: window.isSecureContext,
  serviceWorkerDefined: 'serviceWorker' in navigator,
  standalone: matchMedia('(display-mode: standalone)').matches,
}))
console.log('\n--- page flags ---')
console.log(JSON.stringify(flags))

const sw = await page.evaluate(async () => {
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    return regs.map((r) => ({ scope: r.scope, active: r.active?.scriptURL ?? null }))
  } catch (e) {
    return 'threw: ' + e.message
  }
})
console.log('--- service worker registrations ---')
console.log(JSON.stringify(sw, null, 1))

await page.waitForTimeout(3000)
console.log('--- beforeinstallprompt ---')
const fired = await page.evaluate(() => window.__bip)
console.log(fired?.length ? `FIRED, platforms ${JSON.stringify(fired)}` : 'did NOT fire')
if (warnings.length) console.log('\nconsole:\n' + warnings.slice(0, 12).join('\n'))

await browser.close()
server.close()
