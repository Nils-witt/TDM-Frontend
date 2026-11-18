import type { ReactNode } from 'react';
import {
  criticalCategoryOf,
  formatPatientName,
  isInbound,
  localDate,
  type Patient,
  patientAge,
  uhsArrival,
} from '@/api/patients';
import {
  type MedicalCategory,
  medicalCategoryPath,
  useMedicalCategories,
} from '@/api/medicalCategories';
import { useNow } from '@/app/useNow';
import Chip from '@/components/Chip';
import ContextMenu from '@/components/menu/ContextMenu';
import { useContextMenu } from '@/components/menu/useContextMenu';
import tableStyles from './CatalogManager.module.scss';
import CriticalCategoryBadge from './CriticalCategoryBadge';

type Action = {
  label: string;
  disabled?: (p: Patient) => string | null;
  run: (p: Patient) => void;
};

type Props = {
  patients: Patient[];
  selectedId?: string | null;
  onPick: (p: Patient) => void;
  // Label and handler of a button per row, e.g. Link; else the row is picked.
  action?: Action;
  // The items of a row's context menu (MenuItems).
  rowMenu?: (p: Patient) => ReactNode;
  // A column with the patient's current UHS.
  showUhs?: boolean;
  // Instead of the UHS column's name, when it arrived there, or Inbound (the
  // UHS's own list).
  showSince?: boolean;
};

// Name (Unknown without one), critical and medical category, birth date with the age, event, and optionally
// the UHS the patient is in.
function PatientTable({
  patients,
  selectedId,
  onPick,
  action,
  rowMenu,
  showUhs,
  showSince,
}: Props) {
  const today = localDate(new Date(useNow(60_000)));
  const categories = useMedicalCategories().data ?? noCategories;
  return (
    <div className={tableStyles.tableWrap}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Name</th>
            {showUhs && <th>UHS</th>}
            {showSince && <th>Arrived</th>}
            {action && (
              <th>
                <span className={tableStyles.hidden}>Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <Row
              key={p.id}
              patient={p}
              today={today}
              categories={categories}
              selected={p.id === selectedId}
              onPick={onPick}
              action={action}
              menu={rowMenu}
              showUhs={showUhs}
              showSince={showSince}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type RowProps = {
  patient: Patient;
  today: string;
  categories: readonly MedicalCategory[];
  selected: boolean;
  onPick: (p: Patient) => void;
  action?: Action;
  menu?: (p: Patient) => ReactNode;
  showUhs?: boolean;
  showSince?: boolean;
};

const noCategories: readonly MedicalCategory[] = [];

const sinceTime = (ts: string) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

function Row({
  patient: p,
  today,
  categories,
  selected,
  onPick,
  action,
  menu,
  showUhs,
  showSince,
}: RowProps) {
  const ctx = useContextMenu();
  const age = patientAge(p.birth_date, today);
  const blocked = action?.disabled?.(p) ?? null;
  const arrival = uhsArrival(p);
  const medical = medicalCategoryPath(categories, p.medical_category);
  return (
    <tr
      className={selected ? tableStyles.highlight : undefined}
      tabIndex={0}
      // The context menu is portaled out of the row, but its events still
      // bubble here through the React tree: a menu item must not pick the row.
      onClick={(e) => {
        if (e.currentTarget.contains(e.target as Node)) onPick(p);
      }}
      onContextMenu={menu ? ctx.onContextMenu : undefined}
      onKeyDown={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(p);
        }
      }}
    >
      <td className={p.first_name || p.last_name ? undefined : 'muted'}>
        {formatPatientName(p)} {age === null ? '' : ` (${age})`}
        <span className={tableStyles.chips}>
          <CriticalCategoryBadge category={criticalCategoryOf(p)} />
          {p.medical_category && (
            <Chip label={medical ?? '(deleted)'} title={medical ?? 'Deleted medical category'} />
          )}
        </span>
      </td>
      {showUhs && (
        <td className={p.uhs && !p.uhs.in_scope ? 'muted' : undefined}>
          {p.uhs ? `${p.uhs.name}${p.uhs.active ? '' : ' (inactive)'}` : ''}
        </td>
      )}
      {showSince && (
        <td
          className={tableStyles.meta}
          title={p.uhs ? `Assigned ${sinceTime(p.uhs.since)}` : undefined}
        >
          {isInbound(p) ? <strong>Inbound</strong> : arrival ? sinceTime(arrival) : ''}
        </td>
      )}
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
      {/* Portaled to the body; it sits in a cell only to stay valid table markup. */}
      {menu && (
        <td className={tableStyles.hidden}>
          <ContextMenu at={ctx.at} onClose={ctx.close} label="Patient">
            {menu(p)}
          </ContextMenu>
        </td>
      )}
    </tr>
  );
}

export default PatientTable;
