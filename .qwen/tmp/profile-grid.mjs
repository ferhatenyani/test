// throwaway: burn a CSS-px grid (photo calibrated: screen 394x853 CSS) on regions of the light profile photo
import sharp from 'sharp'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'
const L = 303, R = 1215, TOP = 25, BOT = 1987
const CW = 394, CH = 853
const SCX = (R - L) / CW, SCY = (BOT - TOP) / CH
const imgX = (cx) => L + cx * SCX
const imgY = (cy) => TOP + cy * SCY

const regions = {
  header: [0, 0, 394, 190],
  infocard: [0, 190, 394, 180],
  settings1: [0, 360, 394, 130],
  settings2: [0, 470, 394, 130],
  logout: [0, 570, 394, 90],
}
for (const [name, [cx0, cy0, cw, ch]] of Object.entries(regions)) {
  const left = Math.round(imgX(cx0)), top = Math.round(imgY(cy0))
  const width = Math.round(cw * SCX), height = Math.round(ch * SCY)
  const Z = 2
  const buf = await sharp(T + 'profile-light-up.jpg').extract({ left, top, width, height })
    .resize({ width: width * Z, height: height * Z }).png().toBuffer()
  const W = width * Z, H = height * Z
  const lines = []
  for (let c = Math.ceil(cx0 / 10) * 10; c <= cx0 + cw; c += 10) {
    const x = ((imgX(c) - left) * Z).toFixed(1)
    const major = c % 50 === 0
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${major ? '#ff2d55' : '#00e5ff'}" stroke-opacity="${major ? .9 : .45}" stroke-width="${major ? 2 : 1}"/>`)
    if (major) lines.push(`<text x="${+x + 3}" y="17" fill="#ff2d55" font-family="monospace" font-size="17" font-weight="bold">${c}</text>`)
  }
  for (let c = Math.ceil(cy0 / 10) * 10; c <= cy0 + ch; c += 10) {
    const y = ((imgY(c) - top) * Z).toFixed(1)
    const major = c % 50 === 0
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${major ? '#ff2d55' : '#00e5ff'}" stroke-opacity="${major ? .9 : .45}" stroke-width="${major ? 2 : 1}"/>`)
    if (major) lines.push(`<text x="3" y="${+y + 18}" fill="#ff2d55" font-family="monospace" font-size="17" font-weight="bold">${c}</text>`)
  }
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><image width="${W}" height="${H}" href="data:image/png;base64,${buf.toString('base64')}"/>${lines.join('')}</svg>`
  await sharp(Buffer.from(svg)).png().toFile(T + `grid-${name}.png`)
  console.log('wrote', name, W + 'x' + H)
}
