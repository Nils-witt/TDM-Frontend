// PDFs fetched before their window opens, because fetching has a side effect
// (an intermediate report is recorded each time), which a window's effect
// could repeat, under StrictMode or when remounted. A window's options name
// one by key. They live only for this page: after a reload the key finds
// nothing, as no window survives one.
type PdfDocument = { url: string; size: number };

const documents = new Map<string, PdfDocument>();
const pendingDrops = new Map<string, number>();

// The object URL lives until the window showing it closes.
export function putPdfDocument(blob: Blob): string {
  const key = crypto.randomUUID();
  documents.set(key, { url: URL.createObjectURL(blob), size: blob.size });
  return key;
}

export function peekPdfDocument(key: string): PdfDocument | null {
  return documents.get(key) ?? null;
}

// The window holds it while mounted.
export function holdPdfDocument(key: string) {
  window.clearTimeout(pendingDrops.get(key));
  pendingDrops.delete(key);
}

// Dropped a moment later, so a remount (StrictMode) finds it again.
export function releasePdfDocument(key: string) {
  pendingDrops.set(
    key,
    window.setTimeout(() => {
      const doc = documents.get(key);
      if (doc) URL.revokeObjectURL(doc.url);
      documents.delete(key);
      pendingDrops.delete(key);
    }, 1000),
  );
}
