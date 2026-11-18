import { type ReactNode, useId } from 'react';
import {
  type Patient,
  type PatientCriticalCategory,
  patientCriticalCategories,
  type PatientFields,
  patientTextMax,
} from '@/api/patients';
import { FieldRow, FormActions, FormError, Section, WidgetForm } from '@/components/form';
import { indentedLabel, useMedicalCategoryOptions } from './medicalCategoryOptions';
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
  const medical = useMedicalCategoryOptions(draft.medical_category);

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
        <FieldRow id={`${id}-category`} label="Category">
          <select
            id={`${id}-category`}
            value={draft.critical_category}
            onChange={(e) => set('critical_category')(e.target.value as PatientCriticalCategory)}
          >
            {patientCriticalCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow id={`${id}-medical`} label="Medical category">
          <select
            id={`${id}-medical`}
            className="grow"
            value={draft.medical_category}
            title={medical.error ?? undefined}
            onChange={(e) => set('medical_category')(e.target.value)}
          >
            {medical.options.map((o) => (
              <option key={o.value} value={o.value}>
                {indentedLabel(o)}
              </option>
            ))}
          </select>
        </FieldRow>
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
