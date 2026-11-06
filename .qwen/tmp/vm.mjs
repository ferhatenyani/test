/**
 * Scratch: one structured measurement pass over the 2FA reference capture.
 * All output is DEVICE px with the CSS px (dev/1.5) alongside.
 *   node .qwen/tmp/vm.mjs
 */
import sharp from 'sharp'
const SRC = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/WhatsApp Image 2026-10-25 at 18.35.12.jpeg'
const { data, info } = await sharp(SRC).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, CH = info.channels
const at = (x, y) => { const i = ((y | 0) * W + (x | 0)) * CH; return [data[i], data[i + 1], data[i + 2]] }
const hex = (c) => '#' + c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
const dd = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
const c1 = (n) => (n / 1.5).toFixed(1)
const mean = (x0, y0, x1, y1) => {
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = at(x, y); r += c[0]; g += c[1]; b += c[2]; n++ }
  return [r / n, g / n, b / n]
}

// ---------- 1. horizontal band structure via row means ----------
console.log('=== ROW-MEAN BAND STRUCTURE (x 40..550) ===')
let prev = mean(40, 0, 550, 0)
for (let y = 1; y < H; y++) {
  const c = mean(40, y, 550, y)
  if (dd(c, prev) > 4) console.log(`  dev y=${String(y).padStart(4)} css=${c1(y).padStart(6)}  ${hex(prev)} -> ${hex(c)}`)
  prev = c
}

// ---------- 2. the six OTP boxes ----------
console.log('\n=== OTP BOXES (band dev y 866..949) ===')
const yMid = 908
for (let b = 0; b < 6; b++) {
  const cx0 = 72 + b * 75, cx1 = cx0 + 74
  // left/right extents at the vertical middle
  let L = -1, R = -1
  for (let x = cx0; x < Math.min(cx0 + 40, W); x++) if (dd(at(x, yMid), [255, 255, 255]) > 8) { L = x; break }
  for (let x = Math.min(cx0 + 74, W - 1); x > cx0 + 30; x--) if (dd(at(x, yMid), [255, 255, 255]) > 8) { R = x; break }
  // top/bottom extents at the horizontal middle of the box
  const mx = L >= 0 && R >= 0 ? (L + R) >> 1 : cx0 + 37
  let T = -1, B = -1
  for (let y = 850; y < 900; y++) if (dd(at(mx, y), [255, 255, 255]) > 8) { T = y; break }
  for (let y = 970; y > 920; y--) if (dd(at(mx, y), [255, 255, 255]) > 8) { B = y; break }
  const bw = R - L + 1, bh = B - T + 1
  // border colour = darkest pixel on the mid-left column; fill = mean of the inner 20x20
  const border = at(L + 1, yMid)
  const fill = mean(L + 20, T + 25, R - 20, B - 25)
  // corner radius: how many rows from T until the left ink reaches L+1
  let rr = 0
  for (let y = T; y < T + 40; y++) {
    let lx = -1
    for (let x = L - 2; x < L + 40; x++) if (dd(at(x, y), [255, 255, 255]) > 8) { lx = x; break }
    if (lx <= L + 1) { rr = y - T; break }
  }
  console.log(
    `  box${b + 1}  L dev=${L} css=${c1(L)}  R dev=${R} css=${c1(R + 1)}  w dev=${bw} css=${c1(bw)}` +
    `  | T dev=${T} css=${c1(T)}  B dev=${B} css=${c1(B + 1)}  h dev=${bh} css=${c1(bh)}` +
    `  | border ${hex(border)}  fill ${hex(fill)}  arc dev=${rr} css=${c1(rr)}`
  )
}
console.log(`  pitch: box1 L=72 -> box2 L=148 => 75 dev = ${c1(75)} css`)

// ---------- 3. gaps + row extent ----------
{
  const edges = []
  let inInk = false
  for (let x = 40; x < 560; x++) {
    const ink = dd(at(x, yMid), [255, 255, 255]) > 8
    if (ink && !inInk) { edges.push(['start', x]); inInk = true }
    if (!ink && inInk) { edges.push(['end', x - 1]); inInk = false }
  }
  console.log('\n  ink runs across the OTP row at dev y=' + yMid + ':')
  for (let i = 0; i < edges.length; i += 2) {
    const s = edges[i][1], e = edges[i + 1][1]
    const gap = i + 2 < edges.length ? edges[i + 2][1] - e - 1 : null
    console.log(`    ${String(s).padStart(3)}..${String(e).padEnd(3)} dev  css ${c1(s)}..${c1(e + 1)}  w=${e - s + 1}dev/${c1(e - s + 1)}css` + (gap !== null ? `  gap ${gap}dev/${c1(gap)}css` : ''))
  }
}

// ---------- 4. colour samples at named CSS points ----------
console.log('\n=== COLOUR SAMPLES ===')
const pts = {
  'page bg (top-left)': [10, 120],
  'sheet bg': [295, 830],
  'sheet green bar mid': [295, 753],
  'sheet green bar left': [60, 753],
  'sheet green bar right': [530, 753],
  'mint banner bg': [500, 300],
  'mint banner text': [150, 303],
  'amber banner bg': [500, 620],
  'qr card bg': [150, 500],
  'button mid': [295, 990],
  'button left': [80, 990],
  'button right': [510, 990],
}
for (const [k, [x, y]] of Object.entries(pts)) console.log(`  ${k.padEnd(22)} dev(${x},${y}) css(${c1(x)},${c1(y)})  ${hex(at(x, y))}`)
