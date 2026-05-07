/**
 * Generic sprite-sheet slicer.
 *
 * Usage:
 *   node tools/slice-sprites.js <source-image> [cols] [rows]
 *
 * Defaults: 8 cols × 4 rows.
 *
 * Each row gets a name from DIR_NAMES below (down / up / left / right
 * for a typical RPG character sheet); extra rows fall back to "rowN".
 *
 * Output goes to public/sprites/<row-name>_<00..NN>.png and is also
 * chroma-keyed: any near-uniform light-gray pixel (the checkerboard
 * pattern that JPEG exports leave when alpha is lost) is set
 * transparent in the output PNGs.
 *
 * The script is content-agnostic — point it at ANY sprite sheet you
 * have proper rights to use (your own art, CC0/public domain, etc.)
 * and it slices the cells out.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Jimp's exports moved between major versions. Be flexible.
const jimpMod = await import('jimp');
const Jimp = jimpMod.Jimp || jimpMod.default || jimpMod;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node tools/slice-sprites.js <source-image> [cols] [rows]');
  process.exit(1);
}

const SOURCE = path.isAbsolute(args[0]) ? args[0] : path.join(ROOT, args[0]);
const COLS = parseInt(args[1] || '8', 10);
const ROWS = parseInt(args[2] || '4', 10);
const DIR_NAMES = ['down', 'up', 'left', 'right'];

const OUT_DIR = path.join(ROOT, 'public', 'sprites');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

console.log(`source : ${SOURCE}`);
console.log(`grid   : ${COLS} cols × ${ROWS} rows`);

const img = await Jimp.read(SOURCE);
console.log(`pixels : ${img.bitmap.width} × ${img.bitmap.height}`);

// ---- chroma-key: transparent-checkerboard light-gray → alpha 0 ----
img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
  const r = this.bitmap.data[idx + 0];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];
  if (Math.abs(r - g) < 14 && Math.abs(g - b) < 14 && r > 175) {
    this.bitmap.data[idx + 3] = 0;
  }
});

const cellW = Math.floor(img.bitmap.width / COLS);
const cellH = Math.floor(img.bitmap.height / ROWS);
console.log(`cell   : ${cellW} × ${cellH}\n`);

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    // Jimp v0/v1 API: crop(x, y, w, h). v1 also accepts an object.
    const cropped =
      typeof img.clone().crop === 'function'
        ? img.clone().crop(c * cellW, r * cellH, cellW, cellH)
        : img.clone();

    const rowName = DIR_NAMES[r] || `row${r}`;
    const file = `${rowName}_${String(c).padStart(2, '0')}.png`;
    const out  = path.join(OUT_DIR, file);

    if (typeof cropped.writeAsync === 'function') {
      await cropped.writeAsync(out);
    } else {
      await cropped.write(out);
    }
    console.log(`wrote  ${path.relative(ROOT, out)}`);
  }
}

console.log('\ndone.');
