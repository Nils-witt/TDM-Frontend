import { useRef } from 'react';
import Alert from '@/components/Alert';
import { CloseIcon } from '@/components/icons';
import { formatSize } from '../shared/logbookEntries';
import type { Attachments } from './LogbookForm.ts';
import styles from './LogbookForm.module.scss';

// The text of images and PDFs is read by OCR, which can be skipped.
function FileAttachments({ files, disabled }: { files: Attachments; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const { attachments, fileTypes, add, update, remove, skipOcr } = files;

  return (
    <div className={styles.files}>
      {attachments.length > 0 && (
        <ul className={styles.fileList}>
          {attachments.map((a) => (
            <li key={a.key} className={styles.file}>
              <div className={styles.fileHead}>
                <input
                  className="grow"
                  value={a.name}
                  onChange={(e) => update(a.key, { name: e.target.value })}
                  aria-label="File name"
                  required
                  disabled={disabled}
                />
                <select
                  value={a.typeId}
                  onChange={(e) => update(a.key, { typeId: e.target.value })}
                  aria-label="File type"
                  disabled={disabled || fileTypes.length === 0}
                >
                  {fileTypes.length === 0 && <option value="">No file types</option>}
                  {fileTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className={`muted ${styles.size}`}>{formatSize(a.file.size)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${a.name}`}
                  title="Remove file"
                  onClick={() => remove(a.key)}
                  disabled={disabled}
                >
                  <CloseIcon />
                </button>
              </div>
              <textarea
                className={styles.fileText}
                rows={1}
                value={a.contentText}
                onChange={(e) => update(a.key, { contentText: e.target.value })}
                placeholder={
                  a.ocr?.state === 'running'
                    ? 'Reading text…'
                    : 'Content as text, e.g. a transcript (optional)'
                }
                aria-label={`Content text of ${a.name}`}
                disabled={disabled}
              />
              {a.ocr?.state === 'running' && (
                <div className={`muted ${styles.ocrStatus}`} role="status">
                  <span>Reading text… {a.ocr.progress}</span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => skipOcr(a.key)}
                    disabled={disabled}
                  >
                    Skip
                  </button>
                </div>
              )}
              {a.ocr?.state === 'error' && <Alert severity="warning">{a.ocr.message}</Alert>}
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          // Picking the same file again adds it again.
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="btn"
        onClick={() => input.current?.click()}
        disabled={disabled}
      >
        Attach files
      </button>
    </div>
  );
}

export default FileAttachments;
