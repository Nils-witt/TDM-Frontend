import { useState } from 'react';
import { fileContentPath } from '@/api/logbook';
import Alert from '@/components/Alert';
import type { WidgetProps } from '../widgetOptions';
import { previewKind } from '../shared/attachmentPreview';
import { downloadUrl, useBlobContent } from '../shared/blobContent';
import { formatSize } from '../shared/logbookEntries';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import styles from './AttachmentViewer.module.scss';

// The rest of a text file is only downloaded, so a large log does not stall the
// page.
const maxTextBytes = 1 << 20;

// Opened in a window from a file list. The content needs the token, so it is
// fetched into an object URL.
function AttachmentViewerWidget({ options }: WidgetProps) {
  const fileId = String(options.fileId);
  const name = String(options.name);
  const mediaType = String(options.mediaType);
  const kind = previewKind({ name, media_type: mediaType });
  const path = fileContentPath(fileId);
  const content = useBlobContent(path, mediaType, kind === 'text' ? maxTextBytes : 0);
  const [actualSize, setActualSize] = useState(false);

  if (fileId === '' || kind === null) {
    return <Alert severity="warning">This file cannot be shown here.</Alert>;
  }

  return (
    <div className={styles.viewer}>
      <WidgetActionBar label="Attachment">
        <WidgetAction
          disabled={content.state !== 'ready'}
          onClick={() => content.state === 'ready' && downloadUrl(content.url, name)}
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
