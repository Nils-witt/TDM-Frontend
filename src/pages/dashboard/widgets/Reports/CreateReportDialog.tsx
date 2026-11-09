import { useId, useMemo, useState } from 'react';
import { useExportTemplates } from '@/api/exportTemplates';
import type { Mission } from '@/api/missions';
import { type Report, reportsApi } from '@/api/reports';
import { FieldRow, FormActions, FormError, SectionText } from '@/components/form';
import { ReportDialog } from './ReportDialog';
import { isFinished } from './reportHelpers';

type Props = {
  missions: readonly Mission[];
  // Picked first if finished: the one the dashboard selected, say.
  missionId: string | null;
  onCreated: (r: Report) => void;
  onClose: () => void;
};

// Of a done or closed mission; the API generates the PDF.
function CreateReportDialog({ missions, missionId, onCreated, onClose }: Props) {
  const id = useId();
  const templates = useExportTemplates();
  const sortedTemplates = templates.items.toSorted((a, b) => a.name.localeCompare(b.name));
  const finished = useMemo(
    () => missions.filter(isFinished).toSorted((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [missions],
  );
  const [pickedMission, setPickedMission] = useState(
    missionId && finished.some((m) => m.id === missionId) ? missionId : '',
  );
  const [pickedTemplate, setPickedTemplate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mission = pickedMission || finished[0]?.id || '';
  const template = pickedTemplate || sortedTemplates[0]?.id || '';

  const submit = async () => {
    if (mission === '' || template === '') return;
    setBusy(true);
    try {
      onCreated(await reportsApi.create(mission, template));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <ReportDialog
      title="Create report"
      busy={busy}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <SectionText>
        The API renders the mission with the template as a PDF and stores it with the data it was
        made from. Reports are made of done or closed missions only.
      </SectionText>
      {finished.length === 0 ? (
        <SectionText>
          <span className="muted">No done or closed missions.</span>
        </SectionText>
      ) : (
        <FieldRow id={`${id}-mission`} label="Mission">
          <select
            id={`${id}-mission`}
            className="grow"
            value={mission}
            onChange={(e) => setPickedMission(e.target.value)}
            autoFocus
          >
            {finished.map((m) => (
              <option key={m.id} value={m.id}>
                {m.occurred_event}
              </option>
            ))}
          </select>
        </FieldRow>
      )}
      {sortedTemplates.length === 0 && templates.error === null ? (
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
            value={template}
            onChange={(e) => setPickedTemplate(e.target.value)}
          >
            {sortedTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FieldRow>
      )}
      <FormActions
        submitLabel={busy ? 'Creating…' : 'Create'}
        canSubmit={mission !== '' && template !== ''}
        busy={busy}
        onDiscard={onClose}
        discardLabel="Cancel"
      />
      <FormError error={error ?? templates.error} onClose={() => setError(null)} />
    </ReportDialog>
  );
}

export default CreateReportDialog;
