/**
 * Shared plumbing for the accuracy harness.
 *
 * Every reference capture is 1.5x device pixels of a phone that is exactly
 * 780 CSS pt tall, so a Playwright context built from PROFILES lands on the
 * capture's own pixel grid — comparisons are 1:1, not scaled guesses.
 */
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
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
  return list.filter(([id]) => only.some((o) => id.startsWith(o)))
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

/** Accepts `#rgb`, `#rrggbb`, `rgb()`, `rgba(a b c / d)` and returns {r,g,b,a:0-255}. */
export function parseColor(input) {
  if (!input) return null
  const s = String(input).trim().toLowerCase()
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
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
