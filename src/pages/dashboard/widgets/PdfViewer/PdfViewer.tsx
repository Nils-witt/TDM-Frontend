import Alert from '@/components/Alert';
import type { WidgetProps } from '../widgetOptions';
import { downloadUrl, useBlobContent } from '../shared/blobContent';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import styles from '../AttachmentViewer/AttachmentViewer.module.scss';

// Opened in a window by Print and the Reports widget. The PDF needs the token,
// so it is fetched into an object URL; a printed mission is rendered anew each
// time the window opens.
function PdfViewerWidget({ options }: WidgetProps) {
  const path = String(options.path);
  const name = String(options.name) || 'document.pdf';
  const content = useBlobContent(path, 'application/pdf');

  if (!path.startsWith('/api/')) {
    return <Alert severity="warning">This document cannot be shown here.</Alert>;
  }

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
