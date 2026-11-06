/**
 * Serve the production build so a phone can actually install the PWA.
 *
 * Chrome only offers install on a secure context, and `localhost` counts only on the
 * machine it runs on — so `vite --host` on a LAN IP can never show the menu entry
 * (navigator.serviceWorker is undefined there). Run this after `npm run build`:
 *
 *   npm run mobile
 *
 * Two ways to get a secure origin on the phone, printed by this script:
 *   1. chrome://flags "Insecure origins treated as secure" — no certificates, per device.
 *   2. A cloudflared quick tunnel (used automatically if `cloudflared` is on PATH) —
 *      gives a real https://*.trycloudflare.com URL with a valid certificate.
 */
import { spawnSync, spawn } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT ?? 4173)
const TUNNEL = !process.argv.includes('--no-tunnel')

if (!fs.existsSync(path.resolve('dist/sw.js'))) {
  console.error('dist/sw.js missing — run `npm run build` first (npm run mobile does it for you).')
  process.exit(1)
}

const lanIpv4 = () =>
  Object.entries(os.networkInterfaces())
    .flatMap(([nic, addrs]) => (addrs ?? []).filter((a) => a.family === 'IPv4' && !a.internal).map((a) => ({ ip: a.address, nic })))

const preview = spawn(`npx vite preview --host --port ${PORT} --strictPort`, {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
})
preview.stdout.on('data', (d) => process.stdout.write(String(d)))
preview.stderr.on('data', (d) => process.stderr.write(String(d)))
process.on('SIGINT', () => preview.kill('SIGINT'))

await new Promise((r) => setTimeout(r, 1500))

const nets = lanIpv4()
console.log('\n=== serving the built PWA ===')
console.log(`  desktop (secure, installable now): http://localhost:${PORT}/`)
for (const n of nets) console.log(`  via "${n.nic}" (LAN IP is NOT a secure context): http://${n.ip}:${PORT}/`)

console.log('\n--- Option 1: trust the LAN origin on the phone (no certs) ---')
console.log('  chrome://flags/#unsafely-treat-insecure-origin-as-secure')
for (const n of nets) console.log(`    enter  http://${n.ip}:${PORT}`)
console.log('  -> Relaunch Chrome -> open that URL on the phone.')
console.log('  Chrome then reports isSecureContext=true, registers /sw.js, and the ⋮ menu shows "Install app".')

if (!TUNNEL) {
  console.log('\n(tunnel skipped, --no-tunnel)')
} else {
  const found = spawnSync('where cloudflared', { shell: true, encoding: 'utf8' })
  if (found.status !== 0) {
    console.log('\n--- Option 2: real HTTPS tunnel ---')
    console.log('  `cloudflared` is not on PATH, so no tunnel was started.')
    console.log('  Install it (https://github.com/cloudflare/cloudflared/releases), re-run this script,')
    console.log('  and it will print an https://*.trycloudflare.com URL that installs with no flags.')
    console.log('  Note: that host is a different app identity from localhost (manifest id resolves per origin).')
  } else {
    console.log('\n--- Option 2: cloudflared quick tunnel ---')
    const tf = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'], {
      shell: true,
    })
    process.on('SIGINT', () => tf.kill('SIGINT'))
    const url = await new Promise((resolve) => {
      const scan = (buf) => {
        const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
        if (m) resolve(m[0])
      }
      tf.stderr.on('data', scan)
      tf.stdout.on('data', scan)
      setTimeout(() => resolve(null), 25000)
    })
    console.log(url ? `  open on the phone: ${url}/  -> ⋮ menu -> "Install app"` : '  tunnel URL not detected within 25s; see cloudflared output above')
  }
}
