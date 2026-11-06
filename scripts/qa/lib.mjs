/**
 * Shared plumbing for the accuracy harness.
 *
 * Every reference capture is 1.5x device pixels of a phone that is exactly
 * 780 CSS pt tall, so a Playwright context built from PROFILES lands on the
 * capture's own pixel grid — comparisons are 1:1, not scaled guesses.
 */
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, mkdirSync, writeFileSync, statSync, rmSync } from 'node:fs'
import path from 'node:path'

export const ROOT = path.resolve(import.meta.dirname, '../..')
export const QA = path.join(ROOT, 'qa')
export const SHOTS = path.join(ROOT, 'screenshots')
export const SPECS = path.join(QA, 'specs')
export const MEASURED = path.join(QA, 'measured')
export const OUT = path.join(QA, 'out')
export const DIFF = path.join(QA, 'diff')

/** Device profiles: css = viewport to drive, device = pixels the capture holds. */
export const PROFILES = {
  a360: { css: { width: 360, height: 780 }, dpr: 1.5 },
  a394: { css: { width: 394, height: 853 }, dpr: 1.5 },
}

export const DEVICE_PX = {
  a360: { width: 540, height: 1170 },
  a394: { width: 591, height: 1280 },
}

/** Rows that carry OS chrome (status-bar glyphs, gesture pill) — no app can repaint them. */
export const DEFAULT_MASK = {
  a360: [[0, 38], [1136, 1170]],
  a394: [[0, 41], [1243, 1280]],
}

export const REFS = path.join(QA, 'refs')

/**
 * Scenario table, merged from one file per page under qa/refs/.
 * Splitting it keeps parallel page agents from editing the same JSON.
 */
export function loadRefs() {
  const merged = {}
  for (const f of readdirSync(REFS).filter((n) => n.endsWith('.json')).sort()) {
    const part = JSON.parse(readFileSync(path.join(REFS, f), 'utf8'))
    for (const [id, sc] of Object.entries(part)) {
      if (merged[id]) throw new Error(`duplicate scenario id "${id}" (in ${f})`)
      merged[id] = { ...sc, _file: f }
    }
  }
  return merged
}


export function scenarios(refs) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const list = Object.entries(refs)
  if (!only.length) return list
  // Substring, not prefix: ids are "<nn>-<page>-<state>" and agents filter by page.
  const hits = list.filter(([id]) => only.some((o) => id.includes(o)))
  // A filter that matches nothing is not an empty run: `pixdiff.mjs` once took a
  // shell typo as an id, compared 0 scenarios and exited 0 — a silent green.
  if (!hits.length) {
    throw new Error(
      `filter [${only.join(', ')}] matched 0 of ${list.length} scenarios. ` +
        `Available: ${list.map(([id]) => id).join(' ')}`,
    )
  }
  return hits
}

const LOCK = path.join(QA, '.lock')
const STALE_MS = 10 * 60 * 1000

/**
 * One render at a time. `vite build` writes a shared dist/ and the preview
 * server binds a fixed port, so concurrent agents would serve each other's
 * half-written bundles. Hold this across build + measure.
 */
export async function withRenderLock(fn, label = 'qa') {
  const deadline = Date.now() + 15 * 60 * 1000
  let waited = false
  for (;;) {
    try {
      mkdirSync(LOCK)
      writeFileSync(path.join(LOCK, 'owner'), `${label} ${process.pid} ${new Date().toISOString()}`)
      break
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      if (!waited) { console.log(`[lock] waiting for ${label}: another render holds qa/.lock`); waited = true }
      try {
        const age = Date.now() - statSync(LOCK).mtimeMs
        if (age > STALE_MS) { console.log(`[lock] removing stale lock (${Math.round(age / 1000)}s)`); rmSync(LOCK, { recursive: true, force: true }); continue }
      } catch { /* vanished */ }
      if (Date.now() > deadline) throw new Error(`timed out waiting for the render lock (${label})`)
      await new Promise((r) => setTimeout(r, 750))
    }
  }
  try {
    return await fn()
  } finally {
    rmSync(LOCK, { recursive: true, force: true })
  }
}

/** Fresh build into the shared dist/. Call while holding the render lock. */
export function runBuild(label = 'measure') {
  const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: true })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || '')
    throw new Error(`${label}: npm run build failed (exit ${r.status})`)
  }
}

export function startPreview(port) {
  const child = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: true,
  })
  return child
}

export async function waitForServer(url, ms = 40000) {
  const deadline = Date.now() + ms
  for (;;) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`preview server did not start: ${url}`)
    await new Promise((r) => setTimeout(r, 250))
  }
}

export function stopPreview(child) {
  if (!child?.pid) return
  if (process.platform === 'win32') {
    // shell:true makes vite a grandchild; only a tree kill reaches it.
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try {
      process.kill(-child.pid)
    } catch {
      /* already gone */
    }
  }
}

const RGB_RE = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i
// Tailwind v4 emits `/opacity` utilities as oklab(); Chrome reports them computed
// that way, so without this branch every `bg-white/20` assertion is "unparsable".
const OKLAB_RE = /^oklab\(\s*([\d.]+%?)[,\s]+(-?[\d.e+-]+)[,\s]+(-?[\d.e+-]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i
const COLOR_TOKEN_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|oklab\([^)]*\)/g

/** Oklab -> 8-bit sRGB (Björn Ottosson's matrices, D65, sRGB transfer curve). */
function oklabToRgb(L, A, Bb, alpha) {
  const l_ = L + 0.3963377794 * A + 0.2158037573 * Bb
  const m_ = L - 0.1055613458 * A - 0.0638541728 * Bb
  const y_ = L - 0.0894841775 * A - 1.291485548 * Bb
  const [l, m, y] = [l_ ** 3, m_ ** 3, y_ ** 3]
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * y,
    -1.2684410218 * l + 2.6097574785 * m - 0.3413193963 * y,
    -0.0041960866 * l - 0.7034186147 * m + 1.707614701 * y,
  ]
  const enc = lin.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, v)) * 255)
  })
  return { r: enc[0], g: enc[1], b: enc[2], a: alpha }
}

const pct = (v, scale = 1) => (String(v).endsWith('%') ? parseFloat(v) / 100 : parseFloat(v)) * scale

/**
 * Accepts `#rgb`, `#rrggbb`, `rgb()`, `rgba(a b c / d)`, `oklab(L a b / alpha)`
 * and returns {r,g,b,a:0-255}.
 */
export function parseColor(input) {
  if (!input) return null
  const s = String(input).trim().toLowerCase()
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const ok = s.match(OKLAB_RE)
  if (ok) {
    return oklabToRgb(
      pct(ok[1]),
      parseFloat(ok[2]),
      parseFloat(ok[3]),
      ok[4] === undefined ? 255 : Math.round(pct(ok[4], 255)),
    )
  }
  if (s.startsWith('#')) {
    const h = s.slice(1)
    if (h.length === 3 || h.length === 4)
      return { r: ix(0), g: ix(1), b: ix(2), a: h.length === 4 ? Math.round(parseInt(h[3], 16) * 17) : 255 }
    if (h.length === 6 || h.length === 8) {
      const n = (i) => parseInt(h.slice(i * 2, i * 2 + 2), 16)
      return { r: n(0), g: n(1), b: n(2), a: h.length === 8 ? n(3) : 255 }
    }
    return null
  }
  const m = s.replace(/\/\s*/g, ' ').replace(/\s+/g, ' ').match(RGB_RE)
  if (!m) return null
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 255 : Math.round(+m[4] * 255) }

  function ix(i) {
    return parseInt(h[i], 16) * 17
  }
}

export function hex(c) {
  if (!c) return 'none'
  const p = (n) => n.toString(16).padStart(2, '0')
  return `#${p(c.r)}${p(c.g)}${p(c.b)}${c.a < 255 ? p(c.a) : ''}`
}

/**
 * Colour stops inside any CSS paint value, in document order. Used to assert
 * gradients, which `backgroundColor` can never see: a `background-image` element
 * computes `backgroundColor` to `rgba(0,0,0,0)`, so a gradient was only ever
 * assertable geometrically. Bare words like the `in oklab` interpolation hint
 * are not matched — only functional colour tokens.
 */
export function colorStops(value) {
  if (!value || value === 'none') return []
  return (String(value).match(COLOR_TOKEN_RE) || []).map(parseColor).filter(Boolean)
}

/** True when the paint value is a gradient function rather than a flat colour. */
export function isGradient(value) {
  return /gradient\(/i.test(String(value || ''))
}

/** Largest single-channel distance; the tolerance unit for colour assertions. */
export function colorDist(a, b) {
  if (!a || !b) return 999
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))
}

export const TOL = {
  geom: 2, // CSS px
  radius: 1,
  fontSize: 0.5,
  lineHeight: 0.5,
  letterSpacing: 0.2,
  color: 0, // exact unless the spec raises it (JPEG-sampled refs need ~8)
  weight: 0,
}

export function fmt(n) {
  return typeof n === 'number' ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : String(n)
}
