/**
 * Video-frame geometry probe — the pxprobe of the login keyboard animation.
 *
 * The reference video (384x832, ~1x CSS, notched device so safe-area top ~44)
 * cannot be fed to pxprobe, which hardcodes the 1.5x capture scale, and reading
 * frames as images burns context. This measures features along scanlines and
 * prints numbers only.
 *
 *   node scripts/qa/kbanim.mjs at  <frame> <x> <y>
 *   node scripts/qa/kbanim.mjs col <frame> <x> [y0] [y1]     # all transitions
 *   node scripts/qa/kbanim.mjs tl  [from] [to]               # writes timeline.csv
 *
 * Columns are chosen so no feature is measured through the other one:
 *   x=20  band only (the logo card starts at ~x55, so this column is band + bg)
 *   x=60  card + form card (clear of the centred logo artwork)
 *   x 120..270, y below the card: the title ink, then the green bar under it
 * The iOS keyboard is a light block and is NOT colour-distinguishable from the
 * form card, so the form card is measured by its TOP edge only, always above the
 * keyboard's own top edge.
 *
 * `tl` writes qa/kbframes/timeline.csv and prints only frames where a feature
 * moved, plus the run boundaries — full numbers stay on disk.
 */
import sharp from 'sharp'
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const DIR = 'qa/kbframes'
const mode = process.argv[2]
const arg = process.argv.slice(3)

const hex = (h) => {
  const s = h.replace('#', '')
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) }
}
const toHex = (c) => (c ? `#${[c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('')}` : '—')
const dist = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b))

const GREEN = hex(process.env.GREEN_HEX ?? '009577')
const TOL = Number(process.env.TOL ?? 45)
// The page bg on this device samples #f4f3f8 (min channel 243) and the card
// samples #fefbff (min channel 254), so a 225 threshold calls the background
// "card" and every run bled to the next real feature. 250 splits them.
const CARD_MIN = Number(process.env.CARD_MIN ?? 250)
const INK_MAX = Number(process.env.INK_MAX ?? 110)

async function load(file) {
  const p = path.isAbsolute(file) ? file : path.join(DIR, file)
  const img = sharp(p)
  const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return {
    data,
    w: info.width,
    h: info.height,
    ch: info.channels,
    at(x, y) {
      x = Math.round(x); y = Math.round(y)
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null
      const i = (y * this.w + x) * this.ch
      return { r: data[i], g: data[i + 1], b: data[i + 2] }
    },
  }
}

const isGreen = (c) => c && dist(c, GREEN) < TOL && c.g > c.r + 15
const isCard = (c) => c && c.r >= CARD_MIN && c.g >= CARD_MIN && c.b >= CARD_MIN
const isInk = (c) => c && Math.max(c.r, c.g, c.b) <= INK_MAX

/**
 * Longest contiguous run of pred in [y0,y1], >= minRun. Longest, not first: the
 * iOS status bar paints white text at y 32..43 on this device, so a "first run"
 * probe locked onto the clock instead of the logo card for the whole video.
 */
function runs(img, x, y0, y1, pred, minRun = 3) {
  const out = []
  for (let y = y0; y <= y1; y++) {
    if (!pred(img.at(x, y))) continue
    let n = 1
    while (y + n <= y1 && pred(img.at(x, y + n))) n++
    if (n >= minRun) out.push([y, y + n - 1, n])
    y += n
  }
  return out
}

function run(img, x, y0, y1, pred, minRun = 3) {
  const r = runs(img, x, y0, y1, pred, minRun)
  if (!r.length) return null
  r.sort((a, b) => b[2] - a[2])
  return [r[0][0], r[0][1]]
}

/** ink rows over a slab, merged into bands; returns the longest ink band */
function ink(img, x0, x1, y0, y1, minCols = 3, minRows = 2) {
  const rows = []
  for (let y = y0; y <= y1; y++) {
    let hit = 0
    for (let x = x0; x <= x1; x += 1) if (isInk(img.at(x, y))) hit++
    rows.push(hit >= minCols)
  }
  const bands = []
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i]) continue
    let n = 1
    while (i + n < rows.length && rows[i + n]) n++
    if (n >= minRows) bands.push([y0 + i, y0 + i + n - 1, n])
    i += n - 1
  }
  if (!bands.length) return null
  bands.sort((a, b) => b[2] - a[2])
  return [bands[0][0], bands[0][1]]
}

/** horizontal runs along row y — runs() above is a COLUMN scanner, not reusable here */
function runsX(img, y, x0, x1, pred, minRun = 3) {
  const out = []
  for (let x = x0; x <= x1; x++) {
    if (!pred(img.at(x, y))) continue
    let n = 1
    while (x + n <= x1 && pred(img.at(x + n, y))) n++
    if (n >= minRun) out.push([x, x + n - 1, n])
    x += n
  }
  return out
}

const TOP = Number(process.env.TOP_Y ?? 46) // below the iOS status bar text

/**
 * Object extent along a scanline: start at the first pred pixel, keep going
 * across gaps up to maxGap, stop at a real gap. The logo artwork sits INSIDE the
 * white card, so a plain run probe reports the card as a 40px fragment; the gap
 * tolerance is what makes this measure the card rather than its artwork.
 */
function scanLine(sample, lo, hi, pred, maxGap, minLen) {
  let start = null
  let end = null
  let gap = 0
  for (let v = lo; v <= hi; v++) {
    const hit = pred(sample(v))
    if (start === null) {
      if (hit) { start = v; end = v }
      continue
    }
    if (hit) { end = v; gap = 0 }
    else if (++gap > maxGap) break
  }
  if (start === null || end - start < minLen) return null
  return [start, end - Math.max(0, gap - 1)]
}

/** vertical object along column x, in [y0,y1] */
const objY = (img, x, y0, y1, pred, maxGap = 10, minLen = 12) =>
  scanLine((y) => img.at(x, y), y0, y1, pred, maxGap, minLen)

/** horizontal object along row y, in [x0,x1] */
const objX = (img, y, x0, x1, pred, maxGap = 10, minLen = 12) =>
  scanLine((x) => img.at(x, y), x0, x1, pred, maxGap, minLen)

function features(img) {
  const band = objY(img, 40, TOP, 300, isGreen, 6, 20)
  const card = objY(img, 190, TOP, 330, isCard, 14, 30)
  const cardMid = card ? Math.round((card[0] + card[1]) / 2) : null
  // Sample the card width 6px inside its top edge: above the logo artwork, so the
  // row is pure card and the measurement is the card's own left/right edges.
  const cardX = card ? objX(img, card[0] + 6, 0, img.w - 1, isCard, 14, 30) : null
  const belowCard = card ? card[1] + 1 : 280
  const title = ink(img, 110, 280, belowCard, Math.min(belowCard + 110, 430), 3, 3)
  const belowTitle = title ? title[1] + 1 : belowCard + 40
  const bar = run(img, 190, belowTitle, Math.min(belowTitle + 70, 470), isGreen, 2)
  const belowBar = bar ? bar[1] + 1 : belowTitle + 20
  const form = objY(img, 190, belowBar, 640, isCard, 10, 20)
  return { band, card, cardMid, cardX, title, bar, form }
}

const f = (n) => (n === null || n === undefined || Number.isNaN(n) ? '-' : n.toFixed(1))

if (mode === 'at' || mode === 'col') {
  const img = await load(arg[0])
  console.log(`${arg[0]}  ${img.w}x${img.h}`)
  if (mode === 'at') {
    console.log(`at (${arg[1]}, ${arg[2]}) -> ${toHex(img.at(Number(arg[1]), Number(arg[2])))}`)
  } else {
    const x = Number(arg[1])
    const lo = Number(arg[2] ?? 0)
    const hi = Number(arg[3] ?? img.h)
    let prev = null
    let prevAt = null
    for (let y = lo; y <= hi; y += 0.5) {
      const c = img.at(x, y)
      if (!c) continue
      if (prev === null || dist(c, prev) > TOL) {
        console.log(`  ${y.toFixed(1).padStart(6)}  ${toHex(c)}   ${prev ? `was ${toHex(prev)} @${prevAt.toFixed(1)}` : 'start'}`)
        prev = c
        prevAt = y
      }
    }
  }
  const F = features(img)
  console.log(`  features: band ${f(F.band?.[0])}..${f(F.band?.[1])}  card ${f(F.card?.[0])}..${f(F.card?.[1])}  ` +
    `title ${f(F.title?.[0])}..${f(F.title?.[1])}  bar ${f(F.bar?.[0])}..${f(F.bar?.[1])}  form ${f(F.form?.[0])}..${f(F.form?.[1])}`)
} else if (mode === 'tl') {
  const files = readdirSync(DIR).filter((n) => /^f_\d+\.png$/.test(n)).sort()
  const from = Number(arg[0] ?? 1)
  const to = Number(arg[1] ?? files.length)
  const LO = Number(process.env.T0 ?? 0.7)
  const HI = Number(process.env.T1 ?? 4.7)
  const tp = path.join(DIR, 'times.csv')
  let times = existsSync(tp)
    ? readFileSync(tp, 'utf8').split(/\r?\n/).map(Number).filter(Number.isFinite).filter((t) => t >= LO - 1e-6 && t <= HI + 1e-6)
    : []
  if (times.length !== files.length)
    console.log(`!! times window has ${times.length} entries vs ${files.length} frames — falling back to nominal 59.94fps`)
  if (!times.length) times = files.map((_, i) => LO + i / 59.94)

  const head = 'idx,t,bandTop,bandBot,cardTop,cardBot,cardH,cardMidY,cardLeft,cardRight,cardW,cardCx,titleTop,titleBot,titleH,barTop,barBot,formTop'
  const rows = [head]
  const table = []
  for (let i = from; i <= to; i++) {
    if (!files[i - 1]) break
    const img = await load(files[i - 1])
    const F = features(img)
    const r = {
      idx: i,
      t: times[i - 1],
      bandTop: F.band?.[0] ?? null,
      bandBot: F.band?.[1] ?? null,
      cardTop: F.card?.[0] ?? null,
      cardBot: F.card?.[1] ?? null,
      cardMid: F.card ? (F.card[0] + F.card[1]) / 2 : null,
      cardLeft: F.cardX?.[0] ?? null,
      cardRight: F.cardX?.[1] ?? null,
      cardCx: F.cardX ? (F.cardX[0] + F.cardX[1]) / 2 : null,
      titleTop: F.title?.[0] ?? null,
      titleBot: F.title?.[1] ?? null,
      barTop: F.bar?.[0] ?? null,
      barBot: F.bar?.[1] ?? null,
      formTop: F.form?.[0] ?? null,
    }
    r.cardH = r.cardTop !== null ? r.cardBot - r.cardTop + 1 : null
    r.cardW = r.cardLeft !== null ? r.cardRight - r.cardLeft + 1 : null
    r.titleH = r.titleTop !== null ? r.titleBot - r.titleTop + 1 : null
    table.push(r)
    rows.push(
      [r.idx, r.t.toFixed(3), r.bandTop, r.bandBot, r.cardTop, r.cardBot, r.cardH, r.cardMid,
        r.cardLeft, r.cardRight, r.cardW, r.cardCx, r.titleTop, r.titleBot, r.titleH, r.barTop, r.barBot, r.formTop]
        .map((v) => (v === null || v === undefined ? '' : typeof v === 'number' ? Number(v.toFixed(1)) : v))
        .join(',')
    )
  }
  writeFileSync(path.join(DIR, 'timeline.csv'), rows.join('\n') + '\n')

  const keys = ['bandTop', 'bandBot', 'cardTop', 'cardH', 'cardW', 'titleTop', 'titleH', 'formTop']
  console.log(`wrote ${DIR}/timeline.csv (${table.length} frames, t ${f(times[from - 1])}..${f(times[to - 1])})`)
  console.log('idx   t      bandTop bandBot cardTop cardH  cardLeft cardW   titleTop titleH  formTop  moved')
  let prev = null
  for (const r of table) {
    const moved = prev ? keys.filter((k) => Math.abs((r[k] ?? -999) - (prev[k] ?? -999)) > 1.0) : ['(first)']
    if (!moved.length) { prev = r; continue }
    console.log(
      `${String(r.idx).padStart(4)} ${f(r.t).padStart(6)}  ${f(r.bandTop).padStart(6)} ${f(r.bandBot).padStart(6)} ` +
        `${f(r.cardTop).padStart(7)} ${f(r.cardH).padStart(6)}  ${f(r.cardLeft).padStart(7)} ${f(r.cardW).padStart(6)}  ` +
        `${f(r.titleTop).padStart(7)} ${f(r.titleH).padStart(6)} ${f(r.formTop).padStart(7)}  ${moved.join(',')}`
    )
    prev = r
  }
  const last = table[table.length - 1]
  if (last) console.log(`last frame idx ${last.idx} t=${f(last.t)} — final state above`)
} else if (mode === 'curve') {
  /**
   * Per-frame transition curve, printed for every frame (no change-point filter).
   *
   * Why these four signals and not the generic feature set:
   *  - cardW at a fixed row through the card centre is the SCALE signal, and it is
   *    immune to the logo artwork, which is dark enough (min channel ~47) to break
   *    any vertical white run and to read as "ink" at INK_MAX 110.
   *  - the form card is measured only above the keyboard's own top edge, because
   *    the iOS keyboard is a white block and is otherwise indistinguishable here.
   */
  const files = readdirSync(DIR).filter((n) => /^f_\d+\.png$/.test(n)).sort()
  const LO = Number(process.env.T0 ?? 0.7)
  const tp = path.join(DIR, 'times.csv')
  const all = existsSync(tp) ? readFileSync(tp, 'utf8').split(/\r?\n/).map(Number).filter(Number.isFinite) : []
  const win = all.filter((t) => t >= LO - 1e-6 && t <= Number(process.env.T1 ?? 4.7) + 1e-6)
  const CX = Number(process.env.CX ?? 192)
  const CARD_Y = Number(process.env.CARD_Y ?? 100) // inside the card in BOTH states
  const KB_TOP = Number(process.env.KB_TOP ?? 496)
  const ranges = (arg[0] ?? '14-32').split(',').map((s) => s.split('-').map(Number))
  console.log('idx   t       bandTop bandBot  cardTop cardBot cardW  scale  formTop  formH')
  for (const [a, b] of ranges) {
    for (let i = a; i <= b; i++) {
      if (!files[i - 1]) break
      const img = await load(files[i - 1])
      const band = objY(img, 40, TOP, 300, isGreen, 6, 20)
      const w = objX(img, CARD_Y, 0, img.w - 1, isCard, 6, 40)
      const cx = w ? Math.round((w[0] + w[1]) / 2) : CX
      const card = objY(img, cx, TOP, 300, isCard, 4, 40)
      const form = objY(img, cx, card ? card[1] + 12 : 200, KB_TOP - 4, isCard, 4, 30)
      const t = Number.isFinite(win[i - 1]) ? win[i - 1] : LO + (i - 1) / 59.94
      const scale = w ? w[1] - w[0] + 1 : null
      console.log(
        `${String(i).padStart(4)} ${t.toFixed(3).padStart(7)}  ${f(band?.[0]).padStart(6)} ${f(band?.[1]).padStart(6)}  ` +
          `${f(card?.[0]).padStart(7)} ${f(card?.[1]).padStart(7)} ${f(scale).padStart(6)} ${f(scale ? scale / 264 : null).padStart(6)}  ` +
          `${f(form?.[0]).padStart(7)} ${f(form ? form[1] - form[0] + 1 : null).padStart(6)}`
      )
    }
    console.log('  --')
  }
} else if (mode === 'curve2') {
  /**
   * Adaptive transition curve. curve's fixed probe row (y=100) fell inside the
   * logo artwork once the card had shrunk past ~0.85, which destroyed the tail of
   * the ramp. Here the card is found by its own top edge first and the width is
   * sampled 4px below it, so the probe row tracks the card as it scales.
   */
  const files = readdirSync(DIR).filter((n) => /^f_\d+\.png$/.test(n)).sort()
  const LO = Number(process.env.T0 ?? 0.7)
  const tp = path.join(DIR, 'times.csv')
  const all = existsSync(tp) ? readFileSync(tp, 'utf8').split(/\r?\n/).map(Number).filter(Number.isFinite) : []
  const win = all.filter((t) => t >= LO - 1e-6 && t <= Number(process.env.T1 ?? 4.7) + 1e-6)
  const KB_TOP = Number(process.env.KB_TOP ?? 496)
  const REST_W = Number(process.env.REST_W ?? 268)
  const REST_TOP = Number(process.env.REST_TOP ?? 96)
  const ranges = (arg[0] ?? '16-34,56-80').split(',').map((s) => s.split('-').map(Number))
  console.log(`idx   t       band    cardTop cardW scale  originY  titleTop titleBot  formTop  dForm`)
  for (const [a, b] of ranges) {
    for (let i = a; i <= b; i++) {
      if (!files[i - 1]) break
      const img = await load(files[i - 1])
      const band = objY(img, 40, TOP, 300, isGreen, 6, 20)
      const objs = runs(img, 192, TOP, KB_TOP - 4, isCard, 25)
      const card = objs.length ? objs[0] : null
      if (!card) {
        console.log(`${String(i).padStart(4)} ${(Number.isFinite(win[i - 1]) ? win[i - 1] : LO + (i - 1) / 59.94).toFixed(3).padStart(7)}  ` +
          `${f(band?.[0])}..${f(band?.[1])}  NO CARD FOUND`)
        continue
      }
      const w = objX(img, card[0] + 4, 0, img.w - 1, isCard, 6, 30)
      const cardW = w ? w[1] - w[0] + 1 : null
      const scale = cardW ? cardW / REST_W : null
      // transform-origin y implied by (top, scale): top' = o + (REST_TOP - o)*scale
      const originY = scale ? (card[0] - scale * REST_TOP) / (1 - scale) : null
      const after = objs.filter((o) => o[0] > card[1] + 10)
      const form = after.length ? after[after.length - 1] : null
      const ttl = ink(img, 60, 330, card[1] + 1, (form ? form[0] : card[1] + 90) - 1, 3, 2)
      const t = Number.isFinite(win[i - 1]) ? win[i - 1] : LO + (i - 1) / 59.94
      console.log(
        `${String(i).padStart(4)} ${t.toFixed(3).padStart(7)}  ${f(band?.[0]).padStart(5)}..${f(band?.[1]).padEnd(5)} ` +
          `${f(card[0]).padStart(7)} ${f(cardW).padStart(6)} ${f(scale).padStart(5)} ${f(originY).padStart(7)}  ` +
          `${f(ttl?.[0]).padStart(8)} ${f(ttl?.[1]).padStart(8)}  ${f(form?.[0]).padStart(7)} ${f(form ? form[0] - 366 : null).padStart(6)}`
      )
    }
    console.log('  --')
  }
} else if (mode === 'rows') {
  /**
   * Row-width scan. A column probe cannot tell the form card (325 wide) from a
   * field pill (285) or the scaled logo card — all white, all stacked. Printing
   * the widest white object per row separates them by width, which is what pins
   * the form card's true top edge.
   */
  const img = await load(arg[0])
  const y0 = Number(arg[1] ?? 200)
  const y1 = Number(arg[2] ?? 420)
  const step = Number(arg[3] ?? 4)
  console.log(`${arg[0]} — widest white object per row, y ${y0}..${y1} step ${step}`)
  for (let y = y0; y <= y1; y += step) {
    const objs = runsX(img, y, 0, img.w - 1, isCard, 6)
    const best = objs.length ? objs.reduce((a, b) => (b[2] > a[2] ? b : a)) : null
    console.log(`  y=${String(y).padStart(4)}  ${best ? `x ${best[0]}..${best[1]}  w ${best[1] - best[0] + 1}` : 'no white object'}`)
  }
} else if (mode === 'curve3') {
  /**
   * The corrected transition curve. curve2's formTop latched onto the white strip
   * BETWEEN the field pills (and, mid-gesture, onto the keyboard's own top edge)
   * and reported a -19 translate. The rows scan proves the form card's top edge
   * moves 368 -> 240 (-128) at constant width 346, so the form card is found by the
   * topmost row whose white object is card-wide AND carries the card's own margins:
   * the iOS keyboard is full-bleed (x 0..383), the card is inset (x ~20..~365).
   */
  const files = readdirSync(DIR).filter((n) => /^f_\d+\.png$/.test(n)).sort()
  const LO = Number(process.env.T0 ?? 0.7)
  const tp = path.join(DIR, 'times.csv')
  const all = existsSync(tp) ? readFileSync(tp, 'utf8').split(/\r?\n/).map(Number).filter(Number.isFinite) : []
  const win = all.filter((t) => t >= LO - 1e-6 && t <= Number(process.env.T1 ?? 4.7) + 1e-6)
  const ranges = (arg[0] ?? '14-38,54-84').split(',').map((s) => s.split('-').map(Number))
  const REST_FORM = Number(process.env.REST_FORM ?? 368)
  console.log('idx   t       band        bandBot  cardTop cardW scale | formTop dForm | titleTop titleH')
  for (const [a, b] of ranges) {
    for (let i = a; i <= b; i++) {
      if (!files[i - 1]) break
      const img = await load(files[i - 1])
      const band = objY(img, 40, TOP, 300, isGreen, 6, 20)
      const objs = runs(img, 192, TOP, 470, isCard, 25)
      const card = objs.length ? objs[0] : null
      const w = card ? objX(img, card[0] + 4, 0, img.w - 1, isCard, 6, 30) : null
      const cardW = w ? w[1] - w[0] + 1 : null
      const scale = cardW ? cardW / 268 : null
      let formTop = null
      for (let y = (card ? card[1] : 200) + 6; y <= 470 && formTop === null; y++) {
        const r = runsX(img, y, 0, img.w - 1, isCard, 300).find((o) => o[0] >= 14 && o[0] <= 32 && o[1] >= 330)
        if (r) formTop = y
      }
      const ttl = card && formTop ? ink(img, 60, 330, card[1] + 1, formTop - 1, 3, 2) : null
      const t = Number.isFinite(win[i - 1]) ? win[i - 1] : LO + (i - 1) / 59.94
      console.log(
        `${String(i).padStart(4)} ${t.toFixed(3).padStart(7)}  ${f(band?.[0]).padStart(5)}..${f(band?.[1]).padEnd(5)} ` +
          `${f(card?.[0]).padStart(7)} ${f(cardW).padStart(6)} ${f(scale).padStart(5)} | ` +
          `${f(formTop).padStart(7)} ${f(formTop === null ? null : formTop - REST_FORM).padStart(6)} | ` +
          `${f(ttl?.[0]).padStart(8)} ${f(ttl ? ttl[1] - ttl[0] + 1 : null).padStart(6)}`
      )
    }
    console.log('  --')
  }
} else {
  console.error('mode must be at|col|tl|curve|curve2|curve3|rows')
  process.exit(1)
}
