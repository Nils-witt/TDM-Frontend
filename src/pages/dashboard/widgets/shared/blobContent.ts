import { useEffect, useState } from 'react';
import { requestCachedBlob } from '@/api/client';

export type BlobContent =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; url: string; text: string | null; size: number };

// Content that needs the token, fetched into an object URL, which is revoked
// when the component unmounts. A window's options, and so path, never change,
// so the content is not reset to loading. textBytes > 0 also reads the first
// that many bytes as text.
export function useBlobContent(path: string, mediaType: string, textBytes = 0): BlobContent {
  const [content, setContent] = useState<BlobContent>({ state: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    let url: string | null = null;
    (async () => {
      // The blob gets the file's own media type: without it a PDF or image
      // would not render from the object URL.
      const blob = new Blob([await requestCachedBlob(path, ctrl.signal)], { type: mediaType });
      const shown = textBytes > 0 ? await blob.slice(0, textBytes).text() : null;
      if (ctrl.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setContent({ state: 'ready', url, text: shown, size: blob.size });
    })().catch((err: unknown) => {
      if (!ctrl.signal.aborted) setContent({ state: 'error', message: (err as Error).message });
    });
    return () => {
      ctrl.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, mediaType, textBytes]);

  return content;
}

export function downloadUrl(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}
