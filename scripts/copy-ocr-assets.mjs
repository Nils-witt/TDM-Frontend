// copy-ocr-assets copies the tesseract.js worker, its WebAssembly core and
// the language data into public/ocr/, so the app serves OCR itself and
// works without internet access. It runs before `npm run dev` and
// `npm run build`; public/ocr/ is not checked in.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const modules = join(web, 'node_modules');
const out = join(web, 'public', 'ocr');

// The worker picks one core by the browser's SIMD support; the form uses
// the LSTM engine only, so only its cores are needed.
const files = [
  'tesseract.js/dist/worker.min.js',
  'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  '@tesseract.js-data/deu/4.0.0_best_int/deu.traineddata.gz',
  '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of files) copyFileSync(join(modules, f), join(out, f.split('/').pop()));
