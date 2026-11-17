import { useCan, useSessionUhs } from '@/app/session';
import { useState } from 'react';
import { formatPatientName, isWalkIn, type Patient, patientsApi } from '@/api/patients';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SectionText, sectionStack } from '@/components/form';
import { formatTime } from './logbookEntries';
import PatientForm from './PatientForm';
import PatientMissionLinks from './PatientMissionLinks';
import PatientStays from './PatientStays';

type Props = {
  patient: Patient;
  readOnly: boolean;
  // With the API's answer after a change.
  onChange: (p: Patient) => void;
  onDeleted: () => void;
  onClose: () => void;
};

// The fields stay editable while every mission is closed; only the links to
// closed missions are frozen (PatientMissionLinks). A change someone else
// made in the meantime fails with 412 (If-Match), shown by the form.
function PatientEditor({ patient, readOnly, onChange, onDeleted, onClose }: Props) {
  const remove = useCan('patients.manage');
  // An UHS function sees missions by name only and cannot change the links.
  const uhsSession = useSessionUhs() !== null;
  const [deleting, setDeleting] = useState(false);
  return (
    <div className={sectionStack}>
      <PatientForm
        // A new version (after a save or someone else's change) starts over.
        key={`${patient.id}-${patient.updated_at}`}
        patient={patient}
        legend={formatPatientName(patient)}
        submitLabel="Save"
        disabled={readOnly}
        onSubmit={async (fields) => onChange(await patientsApi.patch(patient, fields))}
        extra={
          <>
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn"
              disabled={!remove.allowed || uhsSession}
              title={uhsSession ? 'An UHS function cannot delete patients.' : remove.hint}
              onClick={() => setDeleting(true)}
            >
              Delete
            </button>
          </>
        }
      />
      {readOnly && (
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      )}
      <PatientStays patient={patient} onChange={onChange} />
      {isWalkIn(patient) && (
        <SectionText className="muted">Walk-in: linked to no mission.</SectionText>
      )}
      {!uhsSession && (
        <PatientMissionLinks patient={patient} readOnly={readOnly} onChange={onChange} />
      )}
      <SectionText className="muted">
        Created {formatTime(patient.created_at)} by {patient.created_by}, changed{' '}
        {formatTime(patient.updated_at)} by {patient.updated_by}
      </SectionText>
      {deleting && (
        <ConfirmDialog
          title="Delete patient"
          message={
            <SectionText>
              Delete the patient “{formatPatientName(patient)}” and its links to every mission?
            </SectionText>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await patientsApi.remove(patient);
            setDeleting(false);
            onDeleted();
          }}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}

export default PatientEditor;
