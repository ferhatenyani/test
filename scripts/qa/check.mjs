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
  QA, SPECS, MEASURED, TOL, parseColor, colorDist, colorStops, isGradient, fmt, loadRefs,
} from './lib.mjs'

const asJson = process.argv.includes('--json')
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))

const NUMERIC = {
  x: 'geom', y: 'geom', w: 'geom', h: 'geom', cx: 'geom', cy: 'geom',
  radius: 'radius', fontSize: 'fontSize', lineHeight: 'lineHeight',
  letterSpacing: 'letterSpacing', borderWidth: 'geom', opacity: 'geom',
}
const STRING = new Set(['fontWeight', 'textAlign', 'fontFamily'])
const BOOL = new Set(['focused'])

/**
 * `bgImage` expectation: an array of stop colours, or the string "none".
 * Computed backgroundColor is transparent wherever a gradient paints, so before
 * this field existed a gradient could only ever be asserted geometrically.
 */
function compareStops(got, want, tol) {
  const stops = colorStops(got)
  if (want === 'none') {
    if (isGradient(got)) return `expected no gradient, got ${String(got).slice(0, 70)}`
    return null
  }
  if (!Array.isArray(want)) return `bgImage must be an array of stops or "none"`
  if (!isGradient(got)) return `expected a gradient ${want.join('->')} but background-image is ${String(got).slice(0, 40)}`
  if (!stops.length) return `gradient has no parsable colour stops (got ${String(got).slice(0, 70)})`
  if (stops.length !== want.length)
    return `gradient has ${stops.length} stop(s) [${stops.map((s) => `rgb(${s.r},${s.g},${s.b})`).join(' ')}], expected ${want.length}`
  for (let i = 0; i < want.length; i++) {
    const b = parseColor(want[i])
    const d = colorDist(stops[i], b)
    if (d === 999) return `stop ${i}: expected ${want[i]} is unparsable`
    if (d > tol)
      return `stop ${i}: rgb(${stops[i].r},${stops[i].g},${stops[i].b}) is ${fmt(d)} off ${want[i]}`
  }
  return null
}

/**
 * `boxShadow` expectation: "none", or a colour that must appear among the
 * shadow's own colour tokens. Focus rings and glows are box-shadow, so without
 * this the state a focus scenario exists to prove had no assertion target.
 */
function compareShadow(got, want, tol) {
  const value = String(got || 'none')
  if (want === 'none') return value === 'none' ? null : `expected no shadow, got ${value.slice(0, 70)}`
  const b = parseColor(want)
  if (!b) return `boxShadow expectation ${want} is unparsable`
  if (value === 'none') return `expected a ${want} shadow but box-shadow is none`
  const stops = colorStops(value)
  if (!stops.length) return `box-shadow has no parsable colour (${value.slice(0, 70)})`
  const best = Math.min(...stops.map((s) => colorDist(s, b)))
  return best > tol ? `${value.slice(0, 70)} — nearest colour is ${fmt(best)} off ${want}` : null
}

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
  if (kind === 'bool') {
    const a = Boolean(got)
    const b = Boolean(want)
    return a === b ? null : `${got} ≠ ${want}`
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
  // Substring, matching measure.mjs/lib.scenarios(). Page names sit mid-id
  // ("30-service-chips"), so a prefix test silently selected nothing.
  if (only.length && !only.some((o) => id.includes(o))) continue

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
      else if (field === 'bgImage') detail = compareStops(got, want, tol.color)
      else if (field === 'boxShadow') detail = compareShadow(got, want, tol.color)
      else if (BOOL.has(field)) detail = compare(got, want, 'bool', 0)
      else if (STRING.has(field)) detail = compare(got, want, 'string', 0)
      else if (NUMERIC[field]) detail = compare(got, want, 'num', tol[NUMERIC[field]])
      else if (['color', 'bg', 'borderColor'].includes(field)) detail = compare(got, want, 'color', tol.color)
      else detail = `unknown expect key "${field}"`
      if (detail) checks.push({ key: comp.key, field, got, want, detail })
      else passCount++
    }
  }

  // Stacking order. This is a RELATION between two elements, not a measurement
  // of one, so it is the only assertion class available to a page with no
  // readable reference: it cannot be produced by reading the render back into
  // the spec, which is how a capture:null scenario silently becomes a false
  // green (see qa/PENDING.md, scenario 37). Each key must sit strictly BELOW
  // the previous one, i.e. top-to-bottom visual order.
  // `order` is a list of CHAINS: siblings inside one container are comparable,
  // but the first element of one chain and the last of the previous one are not
  // (a nested row inside card A is above the card B that follows it), so each
  // chain is asserted only against itself.
  const chains = (spec.order || []).map((c) => (Array.isArray(c) ? c : [c]))
  for (const chain of chains) {
    for (let i = 1; i < chain.length; i++) {
      const a = chain[i - 1]
      const b = chain[i]
      const ea = dom.els[a]
      const eb = dom.els[b]
      if (!ea || !eb) {
        checks.push({ key: `order.${a}->${b}`, field: 'order', detail: `no [data-qa] for ${!ea ? a : b}` })
        continue
      }
      if (!(eb.y > ea.y)) {
        checks.push({
          key: `order.${a}->${b}`,
          field: 'order',
          got: eb.y,
          want: `> ${ea.y}`,
          detail: `${b} y ${eb.y} is not below ${a} y ${ea.y}`,
        })
      } else passCount++
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

// A filter that selects nothing must never look like success: `check.mjs service`
// once matched zero specs and exited 0, which reads as a green gate.
if (only.length && !results.length) {
  console.error(
    `\nERROR: filter [${only.join(', ')}] matched 0 of ${specFiles.length} specs in qa/specs/. Nothing was verified.`,
  )
  console.error(`available: ${specFiles.map((f) => f.replace(/\.json$/, '')).join(' ') || '(no specs yet)'}`)
  process.exit(2)
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
