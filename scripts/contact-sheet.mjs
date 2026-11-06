import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SRC = 'C:/Users/MyHomehP/Desktop/work/webetu2/screenshots';
const names = process.argv.slice(2);
const OUT = 'C:/Users/MyHomehP/Desktop/work/webetu2/qa/debug/contact-sheet.png';
const W = 300;

const tiles = [];
for (const n of names) {
  const p = path.join(SRC, n);
  if (!fs.existsSync(p)) { console.log('MISSING', n); continue; }
  const meta = await sharp(p).rotate().metadata();
  const buf = await sharp(p).rotate().resize({ width: W }).png().toBuffer();
  const h = Math.round(meta.height / (meta.width / W));
  tiles.push({ buf, h, label: n.replace('WhatsApp Image 2026-10-25 at ', '').replace('.jpeg', '') });
}

const cols = 3;
const rowH = 620;
const rows = Math.ceil(tiles.length / cols);
const canvasW = cols * (W + 8);
const canvasH = rows * (rowH + 8);

const composites = tiles.map((t, i) => ({
  input: t.buf,
  left: (i % cols) * (W + 8),
  top: Math.floor(i / cols) * (rowH + 8),
}));

await sharp({
  create: { width: canvasW, height: canvasH, channels: 3, background: '#222222' },
})
  .composite(composites)
  .png()
  .toFile(OUT);

console.log('wrote', OUT, canvasW + 'x' + canvasH);
console.log('labels (row-major):', tiles.map(t => t.label).join(' | '));
