import { useId } from 'react';
import { FieldRow, FormActions, FormError, SectionText } from '@/components/form';
import type { CreateReport } from './useCreateReport';

// The fields of useCreateReport, for the caller's own form.
export function CreateReportFields({
  state,
  onClose,
}: {
  state: CreateReport;
  onClose?: () => void;
}) {
  const id = useId();
  const { locked, templates, sortedTemplates, finished, mission, template, busy, error } = state;
  return (
    <>
      <SectionText>
        The API renders the mission with the template as a PDF and stores it with the data it was
        made from. Reports are made of done or closed missions only.
      </SectionText>
      {finished.length === 0 ? (
        <SectionText>
          <span className="muted">
            {locked ? 'This mission is not done or closed.' : 'No done or closed missions.'}
          </span>
        </SectionText>
      ) : locked ? (
        <FieldRow id={`${id}-mission`} label="Mission">
          <input
            id={`${id}-mission`}
            className="grow"
            value={finished[0].occurred_event}
            readOnly
          />
        </FieldRow>
      ) : (
        <FieldRow id={`${id}-mission`} label="Mission">
          <select
            id={`${id}-mission`}
            className="grow"
            value={mission}
            onChange={(e) => state.setPickedMission(e.target.value)}
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
            onChange={(e) => state.setPickedTemplate(e.target.value)}
            autoFocus={locked}
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
      <FormError error={error ?? templates.error} onClose={() => state.setError(null)} />
    </>
  );
}
