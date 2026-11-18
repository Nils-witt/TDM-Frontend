import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { ReactNode } from 'react';
import {
  type Patient,
  patientCriticalCategories,
  type PatientFields,
  patientTextMax,
} from '@/api/patients';
import { useMedicalCategoryOptions } from '@/pages/dashboard/widgets/shared/medicalCategoryOptions';
import { usePatientForm } from '@/pages/dashboard/widgets/shared/usePatientForm';
import {
  FieldRowMUI,
  FormActionsMUI,
  FormErrorMUI,
  FormMUI,
  FormSectionMUI,
} from '../shared/FormMUI';

type Props = {
  // null for a new patient; the caller keys it by the patient's version.
  patient: Patient | null;
  legend: ReactNode;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (fields: PatientFields) => Promise<void>;
  aside?: ReactNode;
};

// The desktop PatientForm in MUI, on the same usePatientForm.
function PatientFormMUI({ patient, legend, submitLabel, disabled, onSubmit, aside }: Props) {
  const { draft, set, today, busy, error, setError, dirty, submit, reset } = usePatientForm(
    patient,
    onSubmit,
    disabled,
  );
  const medical = useMedicalCategoryOptions(draft.medical_category);
  const text = (key: 'first_name' | 'last_name' | 'event', label: string) => (
    <TextField
      label={label}
      value={draft[key]}
      disabled={disabled}
      autoComplete="off"
      slotProps={{ htmlInput: { maxLength: patientTextMax } }}
      onChange={(e) => set(key)(e.target.value)}
    />
  );
  return (
    <FormMUI onSubmit={(e) => void submit(e)}>
      <FormSectionMUI legend={legend} disabled={disabled}>
        <FieldRowMUI>
          {text('last_name', 'Last name')}
          {text('first_name', 'First name')}
        </FieldRowMUI>
        <FieldRowMUI>
          <TextField
            label="Birth date"
            type="date"
            value={draft.birth_date}
            disabled={disabled}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
            onChange={(e) => set('birth_date')(e.target.value)}
          />
          {text('event', 'Event')}
        </FieldRowMUI>
        <FieldRowMUI>
          <TextField
            select
            label="Category"
            value={draft.critical_category}
            disabled={disabled}
            onChange={(e) => set('critical_category')(e.target.value)}
          >
            {patientCriticalCategories.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Medical category"
            value={draft.medical_category}
            disabled={disabled}
            error={medical.error !== null}
            helperText={medical.error ?? undefined}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
            onChange={(e) => set('medical_category')(e.target.value)}
          >
            {medical.options.map((o) => (
              <MenuItem key={o.value} value={o.value} sx={{ pl: 2 + o.depth * 2 }}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </FieldRowMUI>
      </FormSectionMUI>
      <FormActionsMUI
        submitLabel={submitLabel}
        canSubmit={!patient || dirty}
        busy={busy}
        hidden={disabled}
        dirty={dirty}
        onDiscard={patient ? reset : undefined}
        aside={aside}
      />
      <FormErrorMUI error={error} onClose={() => setError(null)} />
    </FormMUI>
  );
}

export default PatientFormMUI;
