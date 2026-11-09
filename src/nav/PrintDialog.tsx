import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { missionExportPath, useExportTemplates } from '@/api/exportTemplates';
import { FieldRow, FormActions, FormError, SectionText, WidgetForm } from '@/components/form';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import styles from '@/components/ConfirmDialog.module.scss';

type Props = {
  missionId: string;
  // Named in the dialog and the window.
  event: string;
  onClose: () => void;
};

// Printing opens the PDF the API makes in a window; nothing is stored (see the
// Reports widget for that). Opens when mounted; Escape, the backdrop and Cancel
// close it.
function PrintDialog({ missionId, event, onClose }: Props) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const templates = useExportTemplates();
  const { openWidget } = useWidgetWindows();
  const sorted = templates.items.toSorted((a, b) => a.name.localeCompare(b.name));
  const [picked, setPicked] = useState('');
  const templateId = picked || sorted[0]?.id || '';

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (templateId === '') return;
    openWidget('PdfViewer', {
      path: missionExportPath(missionId, templateId),
      name: `${event}.pdf`,
    });
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        // Escape: closing is up to the parent, which unmounts the dialog.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <WidgetForm onSubmit={submit}>
        <h2 id={`${id}-title`}>Print mission</h2>
        <SectionText>
          Print <strong>{event}</strong> as a PDF. It opens in a window.
        </SectionText>
        {sorted.length === 0 && templates.error === null ? (
          <SectionText>
            <span className="muted">
              {templates.loading
                ? 'Loading templates…'
                : 'No export templates yet: an admin adds them.'}
            </span>
          </SectionText>
        ) : (
          <FieldRow id={`${id}-template`} label="Template">
            <select
              id={`${id}-template`}
              className="grow"
              value={templateId}
              onChange={(e) => setPicked(e.target.value)}
              autoFocus
            >
              {sorted.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FieldRow>
        )}
        <FormActions
          submitLabel="Print"
          canSubmit={templateId !== ''}
          onDiscard={onClose}
          discardLabel="Cancel"
        />
        <FormError error={templates.error} onClose={onClose} />
      </WidgetForm>
    </dialog>
  );
}

export default PrintDialog;
