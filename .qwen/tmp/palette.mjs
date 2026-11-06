// Sample fixed device coordinates across every login capture -> palette table.
import sharp from 'sharp'
import path from 'node:path'
const SHOTS = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots'
const CAPS = [
  ['01 en-light', 'WhatsApp Image 2026-10-25 at 18.25.55.jpeg'],
  ['02 en-l-fill', 'WhatsApp Image 2026-10-25 at 18.25.56 (1).jpeg'],
  ['03 en-l-focus', 'WhatsApp Image 2026-10-25 at 18.25.56.jpeg'],
  ['04 en-dark', 'WhatsApp Image 2026-10-25 at 18.25.56 (2).jpeg'],
  ['05 en-d-focus', 'WhatsApp Image 2026-10-25 at 18.25.56 (3).jpeg'],
  ['06 ar-dark', 'WhatsApp Image 2026-10-25 at 18.25.56 (4).jpeg'],
  ['07 ar-d-fill', 'WhatsApp Image 2026-10-25 at 18.25.56 (5).jpeg'],
  ['08 ar-light', 'WhatsApp Image 2026-10-25 at 18.25.56 (6).jpeg'],
  ['09 ar-l-focus', 'WhatsApp Image 2026-10-25 at 18.25.57.jpeg'],
]
// device px sample points
const PTS = {
  'statusbar y20': [270, 20],
  'band y100': [270, 100],
  'band y150 x20': [20, 150],
  'logoCard ctr': [270, 300],
  'formcard bg': [460, 520],
  'page bg y1000': [270, 1000],
  'pill1 fill': [300, 605],
  'pill1 top y569': [300, 569],
  'pill2 fill': [300, 745],
  'pill2 top y710': [300, 710],
  'button y850': [150, 850],
  'label1 y543': [100, 543],
  'title y415': [200, 415],
}
const hx = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')
const keys = Object.keys(PTS)
console.log('capture'.padEnd(15) + keys.map((k) => k.padEnd(17)).join(''))
for (const [name, file] of CAPS) {
  const { data, info } = await sharp(path.join(SHOTS, file)).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, CH = info.channels
  const at = (x, y) => { const i = (y * W + x) * CH; return [data[i], data[i + 1], data[i + 2]] }
  // median over a 9x9 box for stability
  const sample = ([x, y]) => {
    const px = []
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) px.push(at(x + dx, y + dy))
    return hx([0, 1, 2].map((k) => px.map((p) => p[k]).sort((a, b) => a - b)[px.length >> 1]))
  }
  console.log(name.padEnd(15) + keys.map((k) => sample(PTS[k]).padEnd(17)).join(''))
}
