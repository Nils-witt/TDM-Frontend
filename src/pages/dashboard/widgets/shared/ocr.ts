import type { Worker } from 'tesseract.js';

// PDF pages are drawn first, then read one by one.
export type OcrKind = 'image' | 'pdf';

// ocrExtensions stand in when the browser gave a file no media type.
const ocrTypes: Record<string, OcrKind> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'application/pdf': 'pdf',
};
const ocrExtensions: Record<string, OcrKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  pdf: 'pdf',
};

export function ocrKind(file: File): OcrKind | null {
  const kind = ocrTypes[file.type.toLowerCase()];
  if (kind) return kind;
  if (file.type !== '' && file.type !== 'application/octet-stream') return null;
  const dot = file.name.lastIndexOf('.');
  return dot >= 0 ? (ocrExtensions[file.name.slice(dot + 1).toLowerCase()] ?? null) : null;
}

const ocrLanguages = ['deu', 'eng'];

// Draws PDF pages at 144 dpi, enough for OCR of ordinary print.
const pdfScale = 2;

// The running job's progress, 0 to 1.
let onWorkerProgress: ((p: number) => void) | null = null;
let worker: Promise<Worker> | null = null;

// One worker, created on first use. Its script, core and language data are
// served by the app from /ocr/ (see scripts/copy-ocr-assets.mjs), so OCR works
// offline.
function getWorker(): Promise<Worker> {
  worker ??= import('tesseract.js')
    .then(({ createWorker, OEM }) =>
      createWorker(ocrLanguages, OEM.LSTM_ONLY, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/',
        langPath: '/ocr/',
        workerBlobURL: false,
        logger: (m) => {
          if (m.status === 'recognizing text') onWorkerProgress?.(m.progress);
        },
      }),
    )
    .catch((err: unknown) => {
      // A failed start is tried again by the next file.
      worker = null;
      throw err;
    });
  return worker;
}

// The worker reads one image at a time.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

const canceled = () => new DOMException('OCR canceled', 'AbortError');

export type OcrOptions = {
  signal: AbortSignal;
  // Such as "page 2/5, 40 %".
  onProgress: (progress: string) => void;
};

// PDF pages are read one after the other and joined by a blank line. Jobs wait
// for each other; an aborted job ends with an AbortError before its next page.
export function recognizeFile(file: File, { signal, onProgress }: OcrOptions): Promise<string> {
  const kind = ocrKind(file);
  if (kind === null) return Promise.reject(new Error(`${file.name}: not an image or PDF`));
  onProgress('waiting');
  return enqueue(async () => {
    if (signal.aborted) throw canceled();
    onProgress('starting');
    const w = await getWorker();
    const read = async (image: File | HTMLCanvasElement, label: string) => {
      if (signal.aborted) throw canceled();
      onWorkerProgress = (p) => onProgress(`${label}${Math.round(p * 100)} %`);
      onProgress(`${label}0 %`);
      try {
        return (await w.recognize(image)).data.text.trim();
      } finally {
        onWorkerProgress = null;
      }
    };
    if (kind === 'image') return read(file, '');
    return readPdf(file, signal, read);
  });
}

async function readPdf(
  file: File,
  signal: AbortSignal,
  read: (image: HTMLCanvasElement, label: string) => Promise<string>,
): Promise<string> {
  const [pdfjs, { default: workerSrc }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  // Destroying the loading task also destroys the document and its worker.
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      if (signal.aborted) throw canceled();
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: pdfScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      page.cleanup();
      const text = await read(canvas, `page ${i}/${doc.numPages}, `);
      // Free the canvas memory before the next page.
      canvas.width = canvas.height = 0;
      if (text !== '') pages.push(text);
    }
    return pages.join('\n\n');
  } finally {
    await task.destroy();
  }
}
