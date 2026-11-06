// throwaway: sample colours from clean 1.5x captures (dark surfaces) + photo sanity probes
import sharp from 'sharp'
const S = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots/'
const T = 'C:/Users/MyHomehP/Desktop/work/webetu2/.qwen/tmp/'

async function sampler(file) {
  const { data: d, info } = await sharp(S + file).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return (x, y, r = 3) => {
    let R = 0, G = 0, B = 0, n = 0
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const i = ((y + dy) * info.width + (x + dx)) * 4
      R += d[i]; G += d[i + 1]; B += d[i + 2]; n++
    }
    const h = (v) => Math.round(v / n).toString(16).padStart(2, '0')
    return `#${h(R)}${h(G)}${h(B)}`
  }
}
// login dark: 540x1170 device px (a360). Layout (device px): page top band, white-ish card ~y 430-980, inputs, green button ~y 900-990
for (const f of ['WhatsApp Image 2026-10-25 at 18.25.56 (2).jpeg', 'WhatsApp Image 2026-10-25 at 18.25.56 (4).jpeg']) {
  const at = await sampler(f)
  console.log('==', f)
  console.log(' page bg (top-left below status)', at(40, 220))
  console.log(' card bg (form card left edge)', at(60, 560))
  console.log(' input bg (pill interior)', at(270, 640))
  console.log(' input border', at(270, 611))
  console.log(' green btn', at(270, 950))
  console.log(' title text', at(120, 470))
}
// home dark: 591x1280 (a394). nav bar ~y 1180-1250 device; page bg between tiles
for (const f of ['WhatsApp Image 2026-10-25 at 18.56.17.jpeg', 'WhatsApp Image 2026-10-25 at 18.56.55 (1).jpeg']) {
  const at = await sampler(f)
  console.log('==', f)
  console.log(' page bg', at(30, 700))
  console.log(' nav bar bg', at(120, 1210))
  console.log(' nav active pill', at(480, 1210))
  console.log(' tile green', at(120, 900))
}
// light home for light surfaces? 18.18.55 a394
{
  const at = await sampler('WhatsApp Image 2026-10-25 at 18.18.55.jpeg')
  console.log('== 18.18.55 (home light)')
  console.log(' page bg', at(30, 700))
  console.log(' nav bar bg', at(120, 1210))
}
// photo sanity: logout red + header card white + page grey + track grey
{
  const { data: d, info } = await sharp(T + 'profile-light-up.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const at = (x, y, r = 4) => {
    let R = 0, G = 0, B = 0, n = 0
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const i = ((y + dy) * w + (x + dx)) * 4
      R += d[i]; G += d[i + 1]; B += d[i + 2]; n++
    }
    const h = (v) => Math.round(v / n).toString(16).padStart(2, '0')
    return `#${h(R)}${h(G)}${h(B)}`
  }
  const L = 303, TOP = 25, SCX = 912 / 394, SCY = 1962 / 853
  const X = (cx) => Math.round(L + cx * SCX), Y = (cy) => Math.round(TOP + cy * SCY)
  console.log('== photo probes')
  console.log(' logout red', at(X(60), Y(612)), at(X(340), Y(612)))
  console.log(' header card', at(X(120), Y(60)))
  console.log(' page grey', at(X(30), Y(185)))
  console.log(' seg track', at(X(345), Y(414)))
  console.log(' seg EN green', at(X(311), Y(414)))
  console.log(' value ink AKBOU', at(X(85), Y(265), 1))
}
