/**
 * Step 2 of the accuracy harness: assert the measured DOM against the numbers
 * transcribed from the reference capture.
 *
 * A spec file is qa/specs/<scenario-id>.json:
 *
 *   {
 *     "source": "which capture + how each number was obtained",
 *     "components": [
 *       { "key": "pill", "expect": { "h": 45, "radius": 999, "fontSize": 14,
 *         "bg": "#ffffff", "borderColor": "#d7dbe0" }, "tol": { "geom": 1.5 } }
 *     ]
 *   }
 *
 * `expect` keys: x y w h cx cy (CSS px) · fontSize lineHeight letterSpacing
 * radius borderWidth opacity (number) · fontWeight textAlign fontFamily (string)
 * · color bg borderColor (hex or rgb(), compared by max channel distance)
 * · text (exact, whitespace-collapsed)
 *
 *   node scripts/qa/check.mjs              # every spec
 *   node scripts/qa/check.mjs 01-login     # id prefix filter
 *   node scripts/qa/check.mjs --json       # machine-readable output
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import {
  QA, SPECS, MEASURED, TOL, parseColor, colorDist, fmt, loadRefs,
} from './lib.mjs'

const asJson = process.argv.includes('--json')
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))

const NUMERIC = {
  x: 'geom', y: 'geom', w: 'geom', h: 'geom', cx: 'geom', cy: 'geom',
  radius: 'radius', fontSize: 'fontSize', lineHeight: 'lineHeight',
  letterSpacing: 'letterSpacing', borderWidth: 'geom', opacity: 'geom',
}
const STRING = new Set(['fontWeight', 'textAlign', 'fontFamily'])

function measuredValue(entry, key) {
  if (key === 'cx') return Math.round((entry.x + entry.w / 2) * 10) / 10
  if (key === 'cy') return Math.round((entry.y + entry.h / 2) * 10) / 10
  return entry[key]
}

function compare(got, want, kind, tol) {
  if (got === undefined || got === null) return `missing`
  if (kind === 'color') {
    const a = parseColor(got)
    const b = parseColor(want)
    const d = colorDist(a, b)
    if (d === 999) return `unparsable (got ${got} / want ${want})`
    return d > tol ? `${got} → ${fmt(d)} off` : null
  }
  if (kind === 'string') {
    const a = String(got).toLowerCase().trim()
    const b = String(want).toLowerCase().trim()
    return a === b ? null : `${got} ≠ ${want}`
  }
  if (kind === 'text') {
    const a = String(got).replace(/\s+/g, ' ').trim()
    const b = String(want).replace(/\s+/g, ' ').trim()
    return a === b ? null : `“${a}” ≠ “${b}”`
  }
  const d = Math.abs(Number(got) - Number(want))
  return d > tol ? `${got} (Δ${fmt(Math.round(d * 10) / 10)} > ±${tol})` : null
}

const specFiles = existsSync(SPECS)
  ? readdirSync(SPECS).filter((f) => f.endsWith('.json')).sort()
  : []

if (!specFiles.length) {
  console.log('no specs in qa/specs/ — nothing to check')
  process.exit(0)
}

const refs = loadRefs()
const results = []
let failCount = 0
let passCount = 0

for (const file of specFiles) {
  const id = file.replace(/\.json$/, '')
  if (only.length && !only.some((o) => id.startsWith(o))) continue

  const specPath = path.join(SPECS, file)
  const measPath = path.join(MEASURED, `${id}.json`)
  const spec = JSON.parse(readFileSync(specPath, 'utf8'))

  if (!refs[id]) {
    results.push({ id, ok: false, note: `no scenario "${id}" in qa/refs/` })
    failCount++
    continue
  }
  if (!existsSync(measPath)) {
    results.push({ id, ok: false, note: 'not measured — run: node scripts/qa/measure.mjs ' + id })
    failCount++
    continue
  }

  const { dom } = JSON.parse(readFileSync(measPath, 'utf8'))
  const checks = []

  for (const comp of spec.components || []) {
    const entry = dom.els[comp.key]
    if (!entry) {
      checks.push({ key: comp.key, field: '(element)', detail: 'no [data-qa] with this key in the render' })
      continue
    }
    const tol = { ...TOL, ...(comp.tol || {}) }
    for (const [field, want] of Object.entries(comp.expect || {})) {
      const got = measuredValue(entry, field)
      let detail = null
      if (field === 'text') detail = compare(got, want, 'text', 0)
      else if (STRING.has(field)) detail = compare(got, want, 'string', 0)
      else if (NUMERIC[field]) detail = compare(got, want, 'num', tol[NUMERIC[field]])
      else if (['color', 'bg', 'borderColor'].includes(field)) detail = compare(got, want, 'color', tol.color)
      else detail = `unknown expect key "${field}"`
      if (detail) checks.push({ key: comp.key, field, got, want, detail })
      else passCount++
    }
  }

  // Page-level assertions the spec can carry alongside components.
  for (const [k, want] of Object.entries(spec.page || {})) {
    const got = dom[k]
    if (String(got) !== String(want)) checks.push({ key: `page.${k}`, field: k, got, want, detail: `${got} ≠ ${want}` })
    else passCount++
  }

  failCount += checks.length
  results.push({ id, ok: !checks.length, checks, measured: Object.keys(dom.els).length })
}

if (asJson) {
  console.log(JSON.stringify({ results, failed: failCount, passed: passCount }, null, 2))
} else {
  for (const r of results) {
    if (r.ok) console.log(`PASS  ${r.id}  (${r.measured} measured)`)
    else {
      console.log(`FAIL  ${r.id}${r.note ? '  ' + r.note : ''}`)
      for (const c of r.checks || [])
        console.log(`        ${c.key}.${c.field}: ${c.detail}`)
    }
  }
  console.log(`\n${passCount} assertions passed, ${failCount} failed across ${results.length} scenarios`)
}

process.exit(failCount ? 1 : 0)
