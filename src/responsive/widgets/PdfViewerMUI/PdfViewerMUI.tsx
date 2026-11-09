import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useEffect, useState } from 'react';
import {
  type BlobContent,
  downloadUrl,
  useBlobContent,
} from '@/pages/dashboard/widgets/shared/blobContent';
import {
  holdPdfDocument,
  peekPdfDocument,
  releasePdfDocument,
} from '@/pages/dashboard/widgets/shared/pdfDocuments';
import type { WidgetProps } from '@/pages/dashboard/widgets/widgetOptions';
import { ActionMUI, ActionsMUI } from '../shared/ActionsMUI';
import { MutedMUI } from '../shared/FormMUI';
import PdfFrameMUI from '../shared/PdfFrameMUI';

// The PdfViewer widget in MUI: path names an API path to load (a stored
// report), document a PDF already fetched (an intermediate report).
function PdfViewerMUI({ options }: WidgetProps) {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%', minHeight: 0 }}>
      <ActionsMUI label="Document">
        <ActionMUI
          disabled={content.state !== 'ready'}
          onClick={() => content.state === 'ready' && downloadUrl(content.url, name)}
        >
          Download
        </ActionMUI>
      </ActionsMUI>
      {content.state === 'loading' && <MutedMUI>Loading…</MutedMUI>}
      {content.state === 'error' && <Alert severity="error">{content.message}</Alert>}
      {content.state === 'ready' && <PdfFrameMUI url={content.url} name={name} />}
    </Box>
  );
}

export default PdfViewerMUI;
