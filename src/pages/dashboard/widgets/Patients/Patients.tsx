import { useId, useState } from 'react';
import { useDebounced } from '@/api/address';
import { useOffline } from '@/api/connectivity';
import { type Patient, type PatientFilter, usePatients } from '@/api/patients';
import { useHasPermission } from '@/app/session';
import { FormError, SectionHeading, sectionStack } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useSelectedScope } from '@/data/selectedScope';
import PatientEditor from '../shared/PatientEditor';
import { usePatientRowMenu } from '../shared/PatientRowMenu';
import PatientTable from '../shared/PatientTable';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import { useWidgetState } from '../widgetState';
import { patientScope } from './patientScope';

const parseBool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

// Every patient the caller may see, searched by name and event; a patient is
// in every scope one of its missions is in. Clicking one opens it here; the
// dashboard's selection stays. Online only.
function Patients({ options }: WidgetProps) {
  const id = useId();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const scope = useSelectedScope();
  const [q, setQ] = useState('');
  const [event, setEvent] = useState('');
  const [closed, setClosed] = useWidgetState(
    'includeClosed',
    options.includeClosed === true,
    parseBool,
  );
  const [editing, setEditing] = useState<Patient | null>(null);
  const filter: PatientFilter = {
    q: useDebounced(q, 300),
    event: useDebounced(event, 300),
    closed,
    scope: patientScope(scope, true),
  };
  const list = usePatients(offline ? null : filter);
  const menu = usePatientRowMenu();

  if (offline) return <EmptyState>Patients are not available offline.</EmptyState>;

  const actions = (
    <WidgetActionBar label="Patient filters">
      <WidgetAction pressed={closed} onClick={() => setClosed((v) => !v)}>
        Include Closed
      </WidgetAction>
    </WidgetActionBar>
  );

  if (editing) {
    return (
      <PatientEditor
        patient={editing}
        readOnly={!canEdit}
        onChange={(p) => {
          setEditing(p);
          void list.reload();
        }}
        onDeleted={() => {
          setEditing(null);
          void list.reload();
        }}
        onClose={() => setEditing(null)}
      />
    );
  }

  const patients = list.data ?? [];
  return (
    <div className={sectionStack}>
      {actions}
      <div className="row">
        <input
          id={`${id}-q`}
          className="grow"
          type="search"
          placeholder="Name…"
          aria-label="Search by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          id={`${id}-event`}
          className="grow"
          type="search"
          placeholder="Event…"
          aria-label="Search by event"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
        />
      </div>
      <div>
        <SectionHeading>Patients</SectionHeading>
        {list.data === undefined && list.error === null ? (
          <Spinner compact />
        ) : patients.length === 0 ? (
          <EmptyState className="">No matching patients.</EmptyState>
        ) : (
          <PatientTable patients={patients} showUhs rowMenu={menu.rowMenu} onPick={setEditing} />
        )}
      </div>
      <FormError error={list.error} onClose={() => void list.reload()} />
      <FormError error={menu.error} onClose={menu.clearError} />
      {menu.dialog}
    </div>
  );
}

export default Patients;
