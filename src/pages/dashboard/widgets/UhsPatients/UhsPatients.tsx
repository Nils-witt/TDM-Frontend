import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { useHasPermission } from '@/app/session';
import { FormError, sectionStack } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useCatalogs } from '@/data/catalogContext';
import { usePatientRowMenu } from '../shared/PatientRowMenu';
import PatientTable from '../shared/PatientTable';
import WidgetActionBar, { WidgetAction, WidgetActionSelect } from '../shared/WidgetActionBar';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import { useUhsPatients } from './useUhsPatients';

// The patients currently in one UHS of the session's scope, earliest arrival
// first, with the row menu of Patients in Mission. The uhsId option is the
// UHS it starts with; the select in its bar switches it in place. New
// Patient creates a walk-in there. Online only.
function UhsPatients({ options }: WidgetProps) {
  const { uhs } = useCatalogs();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const { openWidget } = useWidgetWindows();
  const menu = usePatientRowMenu();
  // null follows the option until the select picks another.
  const [picked, setChosen] = useState<string | null>(null);
  const chosen = picked ?? String(options.uhsId ?? '');
  const current = uhs.byId.get(chosen);
  const { patients, list } = useUhsPatients(current && !offline ? current.id : null, 'arrival');

  const sorted = uhs.items.toSorted((a, b) => a.name.localeCompare(b.name));
  const actions = (
    <WidgetActionBar label="UHS actions">
      <WidgetActionSelect
        aria-label="UHS"
        value={current ? current.id : ''}
        onChange={(e) => setChosen(e.target.value)}
      >
        <option value="">Choose an UHS…</option>
        {sorted.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {u.active ? '' : ' (inactive)'}
          </option>
        ))}
      </WidgetActionSelect>
      <WidgetAction
        disabled={!canEdit || !current?.active}
        onClick={() => current && openWidget('Patient', { uhsId: current.id })}
      >
        New Patient
      </WidgetAction>
    </WidgetActionBar>
  );

  if (offline) return <EmptyState>Patients are not available offline.</EmptyState>;
  if (!current) {
    return (
      <>
        {actions}
        <EmptyState className="mt">
          {uhs.loading ? 'Loading…' : 'Choose an UHS of this scope.'}
        </EmptyState>
      </>
    );
  }

  return (
    <div className={sectionStack}>
      {actions}
      <div>
        {list.data === undefined && list.error === null ? (
          <Spinner compact />
        ) : patients.length === 0 ? (
          <EmptyState className="">No patients in {current.name}.</EmptyState>
        ) : (
          <PatientTable
            patients={patients}
            showSince
            rowMenu={menu.rowMenu}
            onPick={(p) => openWidget('Patient', { patientId: p.id })}
          />
        )}
      </div>
      <FormError error={list.error ?? menu.error} onClose={() => void list.reload()} />
      {menu.dialog}
    </div>
  );
}

export default UhsPatients;
