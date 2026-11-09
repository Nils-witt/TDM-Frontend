import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useState } from 'react';
import { fileContentPath } from '@/api/logbook';
import { previewKind } from '@/pages/dashboard/widgets/shared/attachmentPreview';
import { downloadUrl, useBlobContent } from '@/pages/dashboard/widgets/shared/blobContent';
import { formatSize } from '@/pages/dashboard/widgets/shared/logbookEntries';
import type { WidgetProps } from '@/pages/dashboard/widgets/widgetOptions';
import { ActionMUI, ActionsMUI } from '../shared/ActionsMUI';
import { MutedMUI } from '../shared/FormMUI';
import PdfFrameMUI from '../shared/PdfFrameMUI';

// The rest of a text file is only downloaded, so a large log does not stall the
// page.
const maxTextBytes = 1 << 20;

// The AttachmentViewer widget in MUI. The content needs the token, so it is
// fetched into an object URL.
function AttachmentViewerMUI({ options }: WidgetProps) {
  const fileId = String(options.fileId);
  const name = String(options.name);
  const mediaType = String(options.mediaType);
  const kind = previewKind({ name, media_type: mediaType });
  const content = useBlobContent(
    fileContentPath(fileId),
    mediaType,
    kind === 'text' ? maxTextBytes : 0,
  );
  const [actualSize, setActualSize] = useState(false);

  if (fileId === '' || kind === null) {
    return <Alert severity="warning">This file cannot be shown here.</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%', minHeight: 0 }}>
      <ActionsMUI label="Attachment">
        <ActionMUI
          disabled={content.state !== 'ready'}
          onClick={() => content.state === 'ready' && downloadUrl(content.url, name)}
        >
          Download
        </ActionMUI>
        {kind === 'image' && (
          <ActionMUI pressed={actualSize} onClick={() => setActualSize((v) => !v)}>
            Actual size
          </ActionMUI>
        )}
      </ActionsMUI>
      {content.state === 'loading' && <MutedMUI>Loading…</MutedMUI>}
      {content.state === 'error' && <Alert severity="error">{content.message}</Alert>}
      {content.state === 'ready' && kind === 'image' && (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', textAlign: 'center' }}>
          <Box
            component="img"
            src={content.url}
            alt={name}
            sx={
              actualSize
                ? { maxWidth: 'none' }
                : { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
            }
          />
        </Box>
      )}
      {content.state === 'ready' && kind === 'pdf' && <PdfFrameMUI url={content.url} name={name} />}
      {content.state === 'ready' && kind === 'text' && (
        <>
          {content.size > maxTextBytes && (
            <Alert severity="warning">
              Showing the first {formatSize(maxTextBytes)} of {formatSize(content.size)}; download
              the file for all of it.
            </Alert>
          )}
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              flex: 1,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.875rem',
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            {content.text}
          </Box>
        </>
      )}
    </Box>
  );
}

export default AttachmentViewerMUI;
