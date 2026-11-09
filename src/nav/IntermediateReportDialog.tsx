import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { intermediateReport, useExportTemplates } from '@/api/exportTemplates';
import { FieldRow, FormActions, FormError, SectionText, WidgetForm } from '@/components/form';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { putPdfDocument } from '@/pages/dashboard/widgets/shared/pdfDocuments';
import styles from '@/components/ConfirmDialog.module.scss';

type Props = {
  missionId: string;
  // Named in the dialog and the window.
  event: string;
  onClose: () => void;
};

// An intermediate report is a watermarked PDF of a mission in any status, shown
// in a window. It is not stored (see the Reports widget for final reports),
// but the API records each one in the mission's audit log, so it is fetched
// here, once per submit, and handed to the window. Opens when mounted; Escape,
// the backdrop and Cancel close it.
function IntermediateReportDialog({ missionId, event, onClose }: Props) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const templates = useExportTemplates();
  const { openWidget } = useWidgetWindows();
  const sorted = templates.items.toSorted((a, b) => a.name.localeCompare(b.name));
  const [picked, setPicked] = useState('');
  const templateId = picked || sorted[0]?.id || '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (templateId === '' || busy) return;
    setBusy(true);
    setError(null);
    try {
      const pdf = await intermediateReport(missionId, templateId);
      openWidget('PdfViewer', {
        document: putPdfDocument(new Blob([pdf], { type: 'application/pdf' })),
        name: `${event} (intermediate report).pdf`,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
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
      <WidgetForm onSubmit={(e) => void submit(e)}>
        <h2 id={`${id}-title`}>Intermediate report</h2>
        <SectionText>
          Create an intermediate report of <strong>{event}</strong> as a PDF. It opens in a window.
          Every page is marked as an intermediate report. The PDF is not stored, but the creation is
          recorded.
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
          submitLabel={busy ? 'Creating…' : 'Create'}
          canSubmit={templateId !== ''}
          busy={busy}
          onDiscard={onClose}
          discardLabel="Cancel"
        />
        <FormError
          error={error ?? templates.error}
          onClose={error === null ? onClose : () => setError(null)}
        />
      </WidgetForm>
    </dialog>
  );
}

export default IntermediateReportDialog;
