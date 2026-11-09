import { useEffect, useState } from 'react';
import Alert from '@/components/Alert';
import type { WidgetProps } from '../widgetOptions';
import { type BlobContent, downloadUrl, useBlobContent } from '../shared/blobContent';
import { holdPdfDocument, peekPdfDocument, releasePdfDocument } from '../shared/pdfDocuments';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import styles from '../AttachmentViewer/AttachmentViewer.module.scss';

// Opened in a window by Intermediate Report and the Reports widget. The PDF
// needs the token, so it is fetched into an object URL. Either path names an
// API path to load (a stored report), or document a PDF already fetched (an
// intermediate report, see pdfDocuments.ts).
function PdfViewerWidget({ options }: WidgetProps) {
  const held = String(options.document ?? '');
  return held !== '' ? (
    <HeldDocument documentKey={held} name={String(options.name ?? '')} />
  ) : (
    <ApiDocument path={String(options.path ?? '')} name={String(options.name ?? '')} />
  );
}

function ApiDocument({ path, name }: { path: string; name: string }) {
  const content = useBlobContent(path, 'application/pdf');
  if (!path.startsWith('/api/')) {
    return <Alert severity="warning">This document cannot be shown here.</Alert>;
  }
  return <Viewer content={content} name={name} />;
}

function HeldDocument({ documentKey, name }: { documentKey: string; name: string }) {
  const [doc] = useState(() => peekPdfDocument(documentKey));

  useEffect(() => {
    holdPdfDocument(documentKey);
    return () => releasePdfDocument(documentKey);
  }, [documentKey]);

  const content: BlobContent =
    doc === null
      ? { state: 'error', message: 'This document is no longer available. Create it again.' }
      : { state: 'ready', url: doc.url, text: null, size: doc.size };
  return <Viewer content={content} name={name} />;
}

function Viewer({ content, name: given }: { content: BlobContent; name: string }) {
  const name = given || 'document.pdf';
  return (
    <div className={styles.viewer}>
      <WidgetActionBar label="Document">
        <WidgetAction
          disabled={content.state !== 'ready'}
          onClick={() => content.state === 'ready' && downloadUrl(content.url, name)}
        >
          Download
        </WidgetAction>
      </WidgetActionBar>
      {content.state === 'loading' && <p className="muted">Loading…</p>}
      {content.state === 'error' && <Alert severity="error">{content.message}</Alert>}
      {content.state === 'ready' && (
        <iframe className={styles.pdf} src={content.url} title={name} />
      )}
    </div>
  );
}

export default PdfViewerWidget;
