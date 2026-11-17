import { type ReactNode, useId } from 'react';
import { type Patient, type PatientFields, patientTextMax } from '@/api/patients';
import { FieldRow, FormActions, FormError, Section, WidgetForm } from '@/components/form';
import { usePatientForm } from './usePatientForm';

type Props = {
  // null for a new patient. Keyed by the caller, so another patient starts
  // a fresh draft.
  patient: Patient | null;
  legend: string;
  submitLabel: string;
  disabled?: boolean;
  // Rejects with the message to show.
  onSubmit: (fields: PatientFields) => Promise<void>;
  onDiscard?: () => void;
  extra?: ReactNode;
};

// Every field is optional, so an unknown patient can be recorded; the API
// trims the text and refuses birth dates in the future.
function PatientForm({
  patient,
  legend,
  submitLabel,
  disabled,
  onSubmit,
  onDiscard,
  extra,
}: Props) {
  const id = useId();
  const { draft, set, today, busy, error, setError, dirty, submit, reset } = usePatientForm(
    patient,
    onSubmit,
    disabled,
  );

  const text = (key: 'first_name' | 'last_name' | 'event', label: string) => (
    <FieldRow id={`${id}-${key}`} label={label}>
      <input
        id={`${id}-${key}`}
        className="grow"
        value={draft[key]}
        maxLength={patientTextMax}
        autoComplete="off"
        onChange={(e) => set(key)(e.target.value)}
      />
    </FieldRow>
  );

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend={legend} disabled={disabled}>
        {text('last_name', 'Last name')}
        {text('first_name', 'First name')}
        <FieldRow id={`${id}-birth`} label="Birth date">
          <input
            id={`${id}-birth`}
            type="date"
            value={draft.birth_date}
            max={today}
            onChange={(e) => set('birth_date')(e.target.value)}
          />
        </FieldRow>
        {text('event', 'Event')}
      </Section>
      <FormActions
        submitLabel={submitLabel}
        busy={busy}
        hidden={disabled}
        canSubmit={!patient || dirty}
        dirty={onDiscard ? true : dirty}
        onDiscard={onDiscard ?? reset}
        discardLabel={onDiscard ? 'Cancel' : 'Discard'}
        extra={extra}
      />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

export default PatientForm;
