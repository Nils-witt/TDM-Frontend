// subset-icon-font writes the Material Symbols font the app serves into
// src/styles/generated/. The package's variable font has four axes and is
// 4 MB; every icon is kept, but weight, grade and optical size are pinned to
// the values the app uses (400, 0, 24), leaving FILL. That is
// about 330 kB, which every client precaches. It runs before `npm run dev`
// and `npm run build`, and only when the package's font changed.
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(web, 'node_modules/material-symbols/material-symbols-outlined.woff2');
const out = join(web, 'src/styles/generated/material-symbols-outlined.woff2');

const mtime = (f) => {
  try {
    return statSync(f).mtimeMs;
  } catch {
    return 0;
  }
};

if (mtime(out) > mtime(source) && mtime(out) > mtime(fileURLToPath(import.meta.url)))
  process.exit(0);

// Icons are ligatures of their names, so keeping these characters keeps
// every icon.
const text = 'abcdefghijklmnopqrstuvwxyz0123456789_';
const font = await subsetFont(readFileSync(source), text, {
  targetFormat: 'woff2',
  variationAxes: { wght: 400, GRAD: 0, opsz: 24 },
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, font);
console.log(`subset-icon-font: ${(font.length / 1024).toFixed(0)} kB`);
