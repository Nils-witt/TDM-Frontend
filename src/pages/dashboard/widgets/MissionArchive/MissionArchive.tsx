import { type FormEvent, useId, useState } from 'react';
import { type Mission, missionStatuses } from '@/api/missions';
import Alert from '@/components/Alert';
import { FieldRow, FormActions, Section, SectionHeading, WidgetForm } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useCatalogs } from '@/data/catalogContext';
import table from '../shared/CatalogManager.module.scss';
import { formatTime } from '../shared/logbookEntries';
import { StatusChip } from '../shared/MissionStatus';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import {
  type ArchiveFilter,
  emptyFilter,
  isEmptyFilter,
  locationText,
  type Sort,
  type SortKey,
  typeName,
  useMissionArchive,
} from './MissionArchive.ts';
import styles from './MissionArchive.module.scss';

// The status option is the status filter it starts with.
function MissionArchiveWidget({ options }: WidgetProps) {
  const archive = useMissionArchive(String(options.status));

  if (archive.error) return <Alert severity="error">{archive.error}</Alert>;
  return (
    <div className={styles.root}>
      <FilterForm
        // A new key resets the inputs when the filter is cleared.
        key={JSON.stringify(archive.filter)}
        filter={archive.filter}
        onApply={archive.setFilter}
      />
      <SectionHeading>
        {archive.loading ? 'Missions' : `${archive.results.length} of ${archive.total} missions`}
      </SectionHeading>
      {archive.loading ? (
        <Spinner compact />
      ) : archive.results.length === 0 ? (
        <EmptyState className="">No missions match.</EmptyState>
      ) : (
        <ResultTable
          missions={archive.results}
          catalogs={archive.catalogs}
          sort={archive.sort}
          sortBy={archive.sortBy}
          selectedId={archive.selectedId}
          select={archive.select}
        />
      )}
    </div>
  );
}

function FilterForm({
  filter,
  onApply,
}: {
  filter: ArchiveFilter;
  onApply: (f: ArchiveFilter) => void;
}) {
  const [draft, setDraft] = useState(filter);
  const { missionTypes, missionTypeGroups } = useCatalogs();
  const id = useId();
  const set = (key: keyof ArchiveFilter) => (value: string) => setDraft({ ...draft, [key]: value });

  const groups = [...missionTypeGroups.items].sort((a, b) => a.name.localeCompare(b.name));
  const types = missionTypes.items
    .filter((t) => draft.typeGroup === '' || t.group_id === draft.typeGroup)
    .sort((a, b) => a.name.localeCompare(b.name));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply(draft);
  };

  const text = (key: keyof ArchiveFilter, label: string, placeholder?: string) => (
    <FieldRow id={`${id}-${key}`} label={label}>
      <input
        id={`${id}-${key}`}
        className="grow"
        type="search"
        value={draft[key]}
        placeholder={placeholder}
        onChange={(e) => set(key)(e.target.value)}
        autoComplete="off"
      />
    </FieldRow>
  );

  return (
    <WidgetForm onSubmit={submit} aria-label="Search missions">
      <Section legend="Search">
        {text('text', 'Any field', 'Event, type, address, callee, tag…')}
        <details className={styles.more} open={!isEmptyFilter({ ...filter, text: '' })}>
          <summary>By field</summary>
          <div className={styles.fields}>
            {text('event', 'Event')}
            <FieldRow id={`${id}-status`} label="Status">
              <select
                id={`${id}-status`}
                className="grow"
                value={draft.status}
                onChange={(e) => set('status')(e.target.value)}
              >
                <option value="">Any status</option>
                {missionStatuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FieldRow>
            <FieldRow id={`${id}-group`} label="Type">
              <select
                id={`${id}-group`}
                className="grow"
                value={draft.typeGroup}
                onChange={(e) => {
                  const group = e.target.value;
                  const type = missionTypes.byId.get(draft.type);
                  // Keep the type only while it belongs to the group.
                  const keep = group === '' || type?.group_id === group;
                  setDraft({ ...draft, typeGroup: group, type: keep ? draft.type : '' });
                }}
              >
                <option value="">Any group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                className="grow"
                aria-label="Mission type"
                value={draft.type}
                onChange={(e) => set('type')(e.target.value)}
              >
                <option value="">Any type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FieldRow>
            {text('objectName', 'Object')}
            {text('street', 'Street')}
            {text('city', 'City')}
            {text('district', 'District')}
            {text('callee', 'Callee', 'Name or phone')}
            {text('tag', 'Tag')}
            <FieldRow id={`${id}-from`} label="Created">
              <input
                id={`${id}-from`}
                className="grow"
                type="date"
                aria-label="Created from"
                value={draft.createdFrom}
                max={draft.createdTo || undefined}
                onChange={(e) => set('createdFrom')(e.target.value)}
              />
              <input
                className="grow"
                type="date"
                aria-label="Created to"
                value={draft.createdTo}
                min={draft.createdFrom || undefined}
                onChange={(e) => set('createdTo')(e.target.value)}
              />
            </FieldRow>
          </div>
        </details>
      </Section>
      <FormActions
        submitLabel="Search"
        onDiscard={() => {
          // The key resets the inputs only when the applied filter changes.
          setDraft(emptyFilter);
          onApply(emptyFilter);
        }}
        discardLabel="Clear"
        dirty={!isEmptyFilter(draft) || !isEmptyFilter(filter)}
      />
    </WidgetForm>
  );
}

const columns: { key: SortKey; label: string }[] = [
  { key: 'created', label: 'Created' },
  { key: 'event', label: 'Event' },
  { key: 'type', label: 'Type' },
  { key: 'location', label: 'Location' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
];

function ResultTable({
  missions,
  catalogs,
  sort,
  sortBy,
  selectedId,
  select,
}: {
  missions: readonly Mission[];
  catalogs: Parameters<typeof typeName>[1];
  sort: Sort;
  sortBy: (key: SortKey) => void;
  selectedId: string | null;
  select: (id: string) => void;
}) {
  return (
    <div className={table.tableWrap}>
      <table className={`${table.table} ${styles.results}`}>
        <thead>
          <tr>
            {columns.map((c) => {
              const sorted = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  aria-sort={sorted ? (sort.descending ? 'descending' : 'ascending') : undefined}
                >
                  <button type="button" className={styles.sort} onClick={() => sortBy(c.key)}>
                    {c.label}
                    <span className={styles.arrow} aria-hidden="true">
                      {sorted ? (sort.descending ? '▼' : '▲') : ''}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {missions.map((m) => {
            const selected = m.id === selectedId;
            return (
              <tr
                key={m.id}
                className={selected ? styles.selected : undefined}
                aria-selected={selected}
                onClick={() => select(m.id)}
              >
                <td className={table.meta}>{formatTime(m.created_at)}</td>
                <td>
                  {/* Reaches the row by keyboard; its click bubbles to the row. */}
                  <button type="button" className={styles.select}>
                    {m.occurred_event}
                  </button>
                </td>
                <td>{typeName(m, catalogs)}</td>
                <td>{locationText(m)}</td>
                <td>{[m.address_city, m.address_district].filter(Boolean).join(' – ')}</td>
                <td>
                  <StatusChip status={m.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default MissionArchiveWidget;
