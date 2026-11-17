import { formatPatientName, localDate, type Patient, patientAge } from '@/api/patients';
import { useNow } from '@/app/useNow';
import tableStyles from './CatalogManager.module.scss';

type Props = {
  patients: Patient[];
  selectedId?: string | null;
  onPick: (p: Patient) => void;
  // Label and handler of a button per row, e.g. Link; else the row is picked.
  action?: { label: string; disabled?: (p: Patient) => string | null; run: (p: Patient) => void };
};

// Name (Unknown without one), birth date with the age, event and how many
// missions the patient is linked to.
function PatientTable({ patients, selectedId, onPick, action }: Props) {
  const today = localDate(new Date(useNow(60_000)));
  return (
    <div className={tableStyles.tableWrap}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Born</th>
            <th>Event</th>
            {action && (
              <th>
                <span className={tableStyles.hidden}>Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => {
            const age = patientAge(p.birth_date, today);
            const blocked = action?.disabled?.(p) ?? null;
            return (
              <tr
                key={p.id}
                className={p.id === selectedId ? tableStyles.highlight : undefined}
                tabIndex={0}
                onClick={() => onPick(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPick(p);
                  }
                }}
              >
                <td className={p.first_name || p.last_name ? undefined : 'muted'}>
                  {formatPatientName(p)}
                </td>
                <td className={tableStyles.meta}>
                  {p.birth_date ? `${p.birth_date}${age === null ? '' : ` (${age})`}` : ''}
                </td>
                <td>{p.event ?? ''}</td>
                {action && (
                  <td>
                    <button
                      type="button"
                      className="btn small"
                      disabled={blocked !== null}
                      title={blocked ?? undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.run(p);
                      }}
                    >
                      {action.label}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PatientTable;
