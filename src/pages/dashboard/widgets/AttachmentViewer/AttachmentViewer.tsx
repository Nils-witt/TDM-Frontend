import { useEffect, useState } from 'react';
import { requestBlob } from '@/api/client';
import { fileContentPath } from '@/api/logbook';
import Alert from '@/components/Alert';
import type { WidgetProps } from '../widgetOptions';
import { previewKind } from '../shared/attachmentPreview';
import { formatSize } from '../shared/logbookEntries';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import styles from './AttachmentViewer.module.scss';

// The rest of a text file is only downloaded, so a large log does not stall the
// page.
const maxTextBytes = 1 << 20;

type Content =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; url: string; text: string | null; size: number };

// The object URL is revoked when the viewer closes. A window's options, and so
// path, never change, so the content is not reset to loading.
function useContent(path: string, mediaType: string, text: boolean): Content {
  const [content, setContent] = useState<Content>({ state: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    let url: string | null = null;
    (async () => {
      // The blob gets the file's own media type: without it a PDF or image
      // would not render from the object URL.
      const blob = new Blob([await requestBlob(path, ctrl.signal)], { type: mediaType });
      const shown = text ? await blob.slice(0, maxTextBytes).text() : null;
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
  }, [path, mediaType, text]);

  return content;
}

function download(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

// Opened in a window from a file list. The content needs the token, so it is
// fetched into an object URL.
function AttachmentViewerWidget({ options }: WidgetProps) {
  const fileId = String(options.fileId);
  const name = String(options.name);
  const mediaType = String(options.mediaType);
  const kind = previewKind({ name, media_type: mediaType });
  const path = fileContentPath(fileId);
  const content = useContent(path, mediaType, kind === 'text');
  const [actualSize, setActualSize] = useState(false);

  if (fileId === '' || kind === null) {
    return <Alert severity="warning">This file cannot be shown here.</Alert>;
  }

  return (
    <div className={styles.viewer}>
      <WidgetActionBar label="Attachment">
        <WidgetAction
          disabled={content.state !== 'ready'}
          onClick={() => content.state === 'ready' && download(content.url, name)}
        >
          Download
        </WidgetAction>
        {kind === 'image' && (
          <WidgetAction pressed={actualSize} onClick={() => setActualSize((v) => !v)}>
            Actual size
          </WidgetAction>
        )}
      </WidgetActionBar>
      {content.state === 'loading' && <p className="muted">Loading…</p>}
      {content.state === 'error' && <Alert severity="error">{content.message}</Alert>}
      {content.state === 'ready' && kind === 'image' && (
        <div className={`${styles.image}${actualSize ? ` ${styles.actual}` : ''}`}>
          <img src={content.url} alt={name} />
        </div>
      )}
      {content.state === 'ready' && kind === 'pdf' && (
        <iframe className={styles.pdf} src={content.url} title={name} />
      )}
      {content.state === 'ready' && kind === 'text' && (
        <>
          {content.size > maxTextBytes && (
            <Alert severity="warning">
              Showing the first {formatSize(maxTextBytes)} of {formatSize(content.size)}; download
              the file for all of it.
            </Alert>
          )}
          <pre className={styles.text}>{content.text}</pre>
        </>
      )}
    </div>
  );
}

export default AttachmentViewerWidget;
