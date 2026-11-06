// Final targeted measurements for the login spec.
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'
const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const a = process.argv[2]
const src = fs.existsSync(a) ? a : path.join(SHOTS, a)
const { data, info } = await sharp(src).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, CH = info.channels
const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
const hx = (c) => '#' + c.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
const D = (p, q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]))
const K = (n) => +(n / 1.5).toFixed(1)
const med = (arr) => arr.sort((x, y) => x - y)[arr.length >> 1]
console.log(`=== ${path.basename(src)}`)

// 1. top strip colours (is the band under the status bar?)
console.log('\n-- top strip, rows 0..44 device, sampled x=140,270,400')
for (let y = 0; y <= 44; y += 2) console.log(`  y=${String(y).padStart(3)} css=${K(y)} ${hx(at(140, y))} ${hx(at(270, y))} ${hx(at(400, y))}`)

// 2. pill top-border colour: for the pill band, take the darkest row across x range
function borderScan(yTop, yBot, x0, x1, tag) {
  const rows = []
  for (let y = yTop - 4; y <= yTop + 4; y++) {
    const c = [0, 1, 2].map((k) => med(Array.from({ length: x1 - x0 }, (_, i) => at(x0 + i, y)[k])))
    rows.push(`y=${y}(${K(y)}) ${hx(c)}`)
  }
  console.log(`\n-- ${tag} top-edge median colour per row: ${rows.join('  ')}`)
  const cols = []
  for (let x = x0 - 4; x <= x0 + 4; x++) {
    const c = [0, 1, 2].map((k) => med(Array.from({ length: yBot - yTop }, (_, i) => at(x, yTop + i)[k])))
    cols.push(`x=${x}(${K(x)}) ${hx(c)}`)
  }
  console.log(`-- ${tag} left-edge median colour per col: ${cols.join('  ')}`)
}
borderScan(570, 638, 150, 400, 'pill1')
borderScan(711, 779, 150, 400, 'pill2')

// 3. pill fill + card bg + page bg medians
function region(x0, y0, x1, y1, tag) {
  const c = [0, 1, 2].map((k) => med(Array.from({ length: (x1 - x0) * (y1 - y0) }, (_, i) => {
    const x = x0 + (i % (x1 - x0)), y = y0 + Math.floor(i / (x1 - x0)); return at(x, y)[k] })))
  console.log(`-- ${tag.padEnd(22)} ${hx(c)}  css box x ${K(x0)}..${K(x1)} y ${K(y0)}..${K(y1)}`)
}
region(160, 585, 400, 620, 'pill1 fill')
region(160, 726, 400, 762, 'pill2 fill')
region(300, 500, 480, 530, 'form card bg')
region(60, 1000, 480, 1060, 'page bg')
region(120, 830, 420, 870, 'button green')
region(30, 100, 500, 105, 'band green')

// 4. logo card corner radius: scan the top-left corner of the white card
function corner(xStart, yStart, dx, dy, pred, tag, n = 40) {
  const pts = []
  for (let i = 0; i < n; i++) {
    let x = xStart, y = yStart
    if (dx > 0) { x = xStart + i * dx; while (x > 0 && !pred(at(x, y))) x-- }
    else { y = yStart + i * dy; while (y > 0 && !pred(at(x, y))) y-- }
    pts.push(`${K(dx > 0 ? x : x)}:${K(dx > 0 ? y : y)}`)
  }
  console.log(`-- ${tag} ${pts.join(' ')}`)
}
const isWhite = (p) => Math.min(p[0], p[1], p[2]) > 238
// logo card: find top edge per column near the left corner
console.log('\n-- logo card top edge per css-x (device col -> first white row from y=90)')
{
  const pts = []
  for (let x = 55; x <= 130; x += 3) { let y = 90; while (y < 200 && !isWhite(at(x, y))) y++; pts.push(`${K(x)}:${K(y)}`) }
  console.log('   ' + pts.join(' '))
}
console.log('-- logo card left edge per css-y (device row -> first white col from x=40)')
{
  const pts = []
  for (let y = 100; y <= 175; y += 3) { let x = 40; while (x < 200 && !isWhite(at(x, y))) x++; pts.push(`${K(y)}:${K(x)}`) }
  console.log('   ' + pts.join(' '))
}
console.log('-- logo card bottom edge per css-x (from y=400 upward)')
{
  const pts = []
  for (let x = 55; x <= 130; x += 3) { let y = 400; while (y > 300 && !isWhite(at(x, y))) y--; pts.push(`${K(x)}:${K(y)}`) }
  console.log('   ' + pts.join(' '))
}
// form card corners
console.log('\n-- form card top edge per css-x (from y=440 down, white>245)')
{
  const isW2 = (p) => Math.min(p[0], p[1], p[2]) > 245
  const pts = []
  for (let x = 20; x <= 90; x += 3) { let y = 440; while (y < 560 && !isW2(at(x, y))) y++; pts.push(`${K(x)}:${K(y)}`) }
  console.log('   ' + pts.join(' '))
  const pts2 = []
  for (let y = 470; y <= 540; y += 3) { let x = 10; while (x < 120 && !isW2(at(x, y))) x++; pts2.push(`${K(y)}:${K(x)}`) }
  console.log('   left edge per y: ' + pts2.join(' '))
}
// 5. label colour: darkest cluster in the label row band
function textColour(x0, y0, x1, y1, thr, tag) {
  const px = []
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const p = at(x, y); if ((p[0] + p[1] + p[2]) / 3 < thr) px.push(p) }
  if (!px.length) return console.log(`-- ${tag} none`)
  const c = [0, 1, 2].map((k) => med(px.map((p) => p[k])))
  const dk = [0, 1, 2].map((k) => Math.min(...px.map((p) => p[k])))
  console.log(`-- ${tag.padEnd(20)} n=${px.length} median ${hx(c)}  min ${hx(dk)}`)
}
console.log()
textColour(60, 530, 230, 552, 170, 'label1 ink')
textColour(60, 672, 150, 694, 170, 'label2 ink')
textColour(160, 400, 380, 430, 160, 'title ink')
textColour(210, 1072, 330, 1094, 190, 'footer ink')
textColour(230, 820, 320, 885, 250, 'button text(white?)')
// 6. button text bbox (white on green)
{
  const isLight = (p) => Math.min(p[0], p[1], p[2]) > 200
  let a1 = 1e9, b1 = 1e9, c1 = -1, e1 = -1
  for (let y = 815; y <= 886; y++) for (let x = 60; x <= 480; x++) if (isLight(at(x, y))) { a1 = Math.min(a1, x); c1 = Math.max(c1, x); b1 = Math.min(b1, y); e1 = Math.max(e1, y) }
  console.log(`\n-- button label ink box: x ${a1}..${c1} css ${K(a1)}..${K(c1)} w=${K(c1 - a1)} | y ${b1}..${e1} css ${K(b1)}..${K(e1)} h=${K(e1 - b1)}`)
}
// 7. title bbox precise
{
  const isInk = (p) => (p[0] + p[1] + p[2]) / 3 < 150
  let a1 = 1e9, b1 = 1e9, c1 = -1, e1 = -1
  for (let y = 380; y <= 450; y++) for (let x = 60; x <= 480; x++) if (isInk(at(x, y))) { a1 = Math.min(a1, x); c1 = Math.max(c1, x); b1 = Math.min(b1, y); e1 = Math.max(e1, y) }
  console.log(`-- title ink box: x ${a1}..${c1} css ${K(a1)}..${K(c1)} w=${K(c1 - a1)} | y ${b1}..${e1} css ${K(b1)}..${K(e1)} h=${K(e1 - b1)}`)
}
// 8. label bbox precise
for (const [y0, y1, tag] of [[520, 560, 'label1'], [665, 700, 'label2']]) {
  const isInk = (p) => (p[0] + p[1] + p[2]) / 3 < 185
  let a1 = 1e9, b1 = 1e9, c1 = -1, e1 = -1
  for (let y = y0; y <= y1; y++) for (let x = 20; x <= 400; x++) if (isInk(at(x, y))) { a1 = Math.min(a1, x); c1 = Math.max(c1, x); b1 = Math.min(b1, y); e1 = Math.max(e1, y) }
  console.log(`-- ${tag} ink box: x ${a1}..${c1} css ${K(a1)}..${K(c1)} w=${K(c1 - a1)} | y ${b1}..${e1} css ${K(b1)}..${K(e1)} h=${K(e1 - b1)}`)
}
// 9. leading icon bbox inside pill1
{
  const isInk = (p) => (p[0] + p[1] + p[2]) / 3 < 175
  let a1 = 1e9, b1 = 1e9, c1 = -1, e1 = -1
  for (let y = 575; y <= 635; y++) for (let x = 60; x <= 130; x++) if (isInk(at(x, y))) { a1 = Math.min(a1, x); c1 = Math.max(c1, x); b1 = Math.min(b1, y); e1 = Math.max(e1, y) }
  console.log(`-- pill1 icon ink: x ${a1}..${c1} css ${K(a1)}..${K(c1)} w=${K(c1 - a1)} | y ${b1}..${e1} css ${K(b1)}..${K(e1)} h=${K(e1 - b1)}`)
  console.log(`   icon left inset from pill edge (pill x0=56): ${K(a1 - 56)} css`)
}
