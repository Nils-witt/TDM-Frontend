import { type MouseEvent, useState } from 'react';
import { isPinned, type LogFile } from '@/api/logbook';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { previewKind } from './attachmentPreview';
import { downloadFile } from './fileDownload';
import { pinLabel, useFilePin } from './filePin';
import { formatSize } from './logbookEntries';
import { FileTypeBadge } from './LogbookTypeBadge';
import styles from './LogFileList.module.scss';

// A click on an image, PDF or text file opens an attachment viewer window; with
// a modifier key held, or for any other file, it downloads. A pinned file shows
// a pin; with canPin it toggles the pin.
function LogFileList({
  files,
  canPin = false,
  onError,
}: {
  files: readonly LogFile[];
  canPin?: boolean;
  onError: (error: string) => void;
}) {
  const { openWidget } = useWidgetWindows();
  const { pinning, toggle } = useFilePin(onError);
  const [downloading, setDownloading] = useState<string | null>(null);

  const open = (e: MouseEvent, f: LogFile) => {
    const plain = !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
    if (plain && previewKind(f) !== null) {
      openWidget('AttachmentViewer', { fileId: f.id, name: f.name, mediaType: f.media_type });
      return;
    }
    setDownloading(f.id);
    downloadFile(f)
      .catch((err: unknown) => onError((err as Error).message))
      .finally(() => setDownloading(null));
  };

  return (
    <ul className={styles.files}>
      {files.map((f) => (
        <li key={f.id}>
          <p className={`secondary ${styles.file}`}>
            <SymbolIcon name="attach_file" className={styles.icon} />
            <button
              type="button"
              className={styles.link}
              disabled={downloading === f.id}
              onClick={(e) => open(e, f)}
            >
              {f.name}
            </button>
            <FileTypeBadge typeId={f.type} />
            <span>{formatSize(f.size)}</span>
            {canPin ? (
              <button
                type="button"
                className={`${styles.pin} ${isPinned(f) ? styles.pinned : ''}`}
                title={pinLabel(f)}
                aria-label={pinLabel(f)}
                aria-pressed={isPinned(f)}
                disabled={pinning === f.id}
                onClick={() => toggle(f)}
              >
                <SymbolIcon name="push_pin" className={styles.icon} />
              </button>
            ) : (
              isPinned(f) && (
                <span className={styles.pinned} title={`Pinned by ${f.pinned_by ?? 'unknown'}`}>
                  <SymbolIcon name="push_pin" className={styles.icon} />
                </span>
              )
            )}
          </p>
          {f.content_text !== '' && (
            <details className={styles.text}>
              <summary className="secondary">Content text</summary>
              <p className="secondary pre">{f.content_text}</p>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

export default LogFileList;
