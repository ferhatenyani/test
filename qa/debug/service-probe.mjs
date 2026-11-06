/**
 * Scratch pixel probe for the service page (owned by the `service` agent).
 *
 * Why this exists: scripts/qa/ruler.mjs lays its grid out with
 *   cssPerPx = scale / ZOOM
 * but the zoomed buffer holds `scale * ZOOM` pixels per CSS px, so the printed
 * labels are 2.25x off the image (a full 360 CSS-wide capture is labelled up to
 * ~810). Transcribing geometry off that grid silently produces wrong numbers.
 * This probe reads raw pixels instead: every input and output is CSS px, and
 * the device px it came from is printed alongside so the 1.5x division is
 * auditable.
 *
 *   node qa/debug/service-probe.mjs vedges "<capture>" <x> <y0> <y1> [bgHex] [thresh]
 *   node qa/debug/service-probe.mjs hedges "<capture>" <y> <x0> <x1> [bgHex] [thresh]
 *   node qa/debug/service-probe.mjs bbox     "<capture>" <x0> <y0> <x1> <y1> <bgHex> [thresh]
 *   node qa/debug/service-probe.mjs px       "<capture>" <x> <y>
 *   node qa/debug/service-probe.mjs rowmode  "<capture>" <y>   # dominant colour runs across a row
 */
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SHOTS = path.join(ROOT, 'screenshots')
const SCALE = 1.5

const file = process.argv[2]
const cmd = process.argv[3]
if (!file || !cmd) {
  console.error('usage: node qa/debug/service-probe.mjs "<capture>" <cmd> [args...]')
  process.exit(1)
}
const args = process.argv.slice(4)

const img = sharp(path.join(SHOTS, file)).rotate()
const meta = await img.clone().metadata()
const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const CH = info.channels

const css2dev = (v) => Math.round(v * SCALE)
const dev2css = (v) => Math.round((v / SCALE) * 10) / 10

function parseHex(s) {
  const h = s.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function px(x, y) {
  const i = (y * W + x) * CH
  return [data[i], data[i + 1], data[i + 2]]
}
const hexOf = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))

console.log(`${file}  ${W}x${H} device = ${dev2css(W)}x${dev2css(H)} CSS`)

if (cmd === 'px') {
  const [x, y] = args.map(Number)
  const c = px(css2dev(x), css2dev(y))
  console.log(`  CSS (${x},${y}) = device (${css2dev(x)},${css2dev(y)}) -> ${hexOf(c)}  rgb(${c.join(', ')})`)
  // neighbourhood so JPEG ringing on thin features is visible
  for (let dy = -1; dy <= 1; dy++) {
    const row = []
    for (let dx = -1; dx <= 1; dx++) row.push(hexOf(px(css2dev(x) + dx, css2dev(y) + dy)))
    console.log(`    dy${dy}: ${row.join(' ')}`)
  }
}

if (cmd === 'vedges' || cmd === 'hedges') {
  const vertical = cmd === 'vedges'
  const [a, b0, b1, bgHex, thresh] = args
  const fixed = css2dev(Number(a))
  const from = css2dev(Number(b0))
  const to = Math.min(css2dev(Number(b1)), vertical ? H - 1 : W - 1)
  const bg = bgHex ? parseHex(bgHex) : null
  const th = Number(thresh ?? 24)
  console.log(`  ${vertical ? 'x' : 'y'}=${a} CSS (${fixed} dev), scanning ${b0}..${b1} CSS, thresh ${th}${bg ? ` vs ${bgHex}` : ''}`)
  let prev = null
  for (let i = from; i <= to; i++) {
    const c = vertical ? px(fixed, i) : px(i, fixed)
    const key = bg ? (dist(c, bg) > th ? 'FG' : 'BG') : hexOf(c)
    if (key !== prev) {
      if (prev !== null) console.log(`    CSS ${String(dev2css(i)).padStart(6)}  dev ${String(i).padStart(4)}  ${key.padEnd(4)} ${hexOf(c)}`)
      prev = key
    }
  }
  console.log(`    end CSS ${dev2css(to)} dev ${to}`)
}

if (cmd === 'bbox') {
  const [x0, y0, x1, y1, bgHex, thresh] = args
  const bg = parseHex(bgHex)
  const th = Number(thresh ?? 24)
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1
  const rowsTouched = []
  for (let y = css2dev(Number(y0)); y <= css2dev(Number(y1)); y++) {
    let rowHit = false
    for (let x = css2dev(Number(x0)); x <= css2dev(Number(x1)); x++) {
      if (dist(px(x, y), bg) > th) {
        rowHit = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    if (rowHit) rowsTouched.push(y)
  }
  if (maxX < 0) { console.log('  no foreground pixels above threshold'); process.exit(0) }
  console.log(`  bbox CSS  x ${dev2css(minX)} .. ${dev2css(maxX)}  (w ${dev2css(maxX - minX + 1)})`)
  console.log(`            y ${dev2css(minY)} .. ${dev2css(maxY)}  (h ${dev2css(maxY - minY + 1)})`)
  console.log(`  device    x ${minX}..${maxX}  y ${minY}..${maxY}  first row ${rowsTouched[0]} last ${rowsTouched[rowsTouched.length - 1]}`)
}

if (cmd === 'colorbbox') {
  // bbox of pixels WITHIN thresh of a target colour (the inverse of `bbox`)
  const [x0, y0, x1, y1, target, thresh] = args
  const want = parseHex(target)
  const th = Number(thresh ?? 24)
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0
  for (let y = css2dev(Number(y0)); y <= css2dev(Number(y1)); y++) {
    for (let x = css2dev(Number(x0)); x <= css2dev(Number(x1)); x++) {
      if (dist(px(x, y), want) <= th) {
        n++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) { console.log('  no pixels within threshold of target'); process.exit(0) }
  console.log(`  ${target} ±${th}  n=${n}`)
  console.log(`  bbox CSS  x ${dev2css(minX)} .. ${dev2css(maxX)}  (w ${dev2css(maxX - minX + 1)}, cx ${dev2css((minX + maxX) / 2)})`)
  console.log(`            y ${dev2css(minY)} .. ${dev2css(maxY)}  (h ${dev2css(maxY - minY + 1)}, cy ${dev2css((minY + maxY) / 2)})`)
  console.log(`  device    x ${minX}..${maxX}  y ${minY}..${maxY}`)
}

if (cmd === 'colraw' || cmd === 'rowraw') {
  const vertical = cmd === 'colraw'
  const [a, b0, b1] = args
  const fixed = css2dev(Number(a))
  const from = css2dev(Number(b0))
  const to = css2dev(Number(b1))
  console.log(`  raw along ${vertical ? 'column x' : 'row y'}=${a} CSS, dev ${from}..${to}`)
  for (let i = from; i <= to; i++) {
    const c = vertical ? px(fixed, i) : px(i, fixed)
    console.log(`    dev ${String(i).padStart(4)}  css ${String(dev2css(i)).padStart(6)}  ${hexOf(c)}  rgb(${c.join(',')})`)
  }
}

if (cmd === 'rowmode') {
  const [y, step] = args
  const row = css2dev(Number(y))
  const th = Number(step ?? 3)
  let run = 1
  let cur = px(0, row)
  const out = []
  for (let x = 1; x < W; x++) {
    const c = px(x, row)
    if (dist(c, cur) <= th) run++
    else { out.push([x - run, run, cur]); cur = c; run = 1 }
  }
  out.push([W - run, run, cur])
  console.log(`  row y=${y} CSS (dev ${row}) colour runs:`)
  for (const [start, len, c] of out) {
    if (len < 3) continue
    console.log(`    CSS x ${dev2css(start)} +${dev2css(len)}  dev ${start}+${len}  ${hexOf(c)}`)
  }
}
