import { useCallback, useDeferredValue, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useOffline } from '@/api/connectivity';
import { type Mission, type MissionStatus, shortLocation } from '@/api/missions';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useCatalogs } from '@/data/catalogContext';
import { useMissions } from '@/data/missionsContext';
import { useMissionTypeName } from '@/data/missionTypeName';
import StatusChip from '../StatusChip';
import { responsivePaths } from '../paths';
import styles from './MissionsPage.module.scss';

// Active is everything not yet finished, the default when the URL names none.
// Closed missions are loaded only for the filters showing them.
const filters = [
  { value: 'all', label: 'All', statuses: null },
  { value: 'active', label: 'Active', statuses: ['draft', 'open', 'in-progress'] },
  { value: 'done', label: 'Done', statuses: ['done'] },
  { value: 'closed', label: 'Closed', statuses: ['closed'] },
] as const satisfies readonly {
  value: string;
  label: string;
  statuses: readonly MissionStatus[] | null;
}[];

type Filter = (typeof filters)[number];

function useFilter(): [Filter, string, (next: { status?: string; q?: string }) => void] {
  const [params, setParams] = useSearchParams();
  const filter = filters.find((f) => f.value === params.get('status')) ?? filters[0];
  const query = params.get('q') ?? '';
  const update = (next: { status?: string; q?: string }) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(next)) {
          if (value) p.set(key, value);
          else p.delete(key);
        }
        if (p.get('status') === filters[0].value) p.delete('status');
        return p;
      },
      // Typing would otherwise add a history entry per keystroke.
      { replace: true },
    );
  return [filter, query, update];
}

// The text a search matches: what the row shows plus the caller.
function useSearchText(): (m: Mission) => string {
  const { missionTypes, missionTypeGroups } = useCatalogs();
  return useCallback(
    (m: Mission) => {
      const type = m.mission_type ? missionTypes.byId.get(m.mission_type) : undefined;
      const group = type ? missionTypeGroups.byId.get(type.group_id) : undefined;
      return [
        m.occurred_event,
        type?.name,
        group?.name,
        m.address_object_name,
        m.address_street,
        m.address_house_number,
        m.address_city,
        m.address_district,
        m.callee,
        ...m.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    },
    [missionTypes, missionTypeGroups],
  );
}

function MissionRow({ mission: m }: { mission: Mission }) {
  const type = useMissionTypeName(m.mission_type);
  const location = [shortLocation(m), m.address_city].filter(Boolean).join(', ');
  return (
    <li>
      <Link to={responsivePaths.mission(m.id)} className={styles.row}>
        <span className={styles.text}>
          <span className={styles.title}>{m.occurred_event || 'Untitled mission'}</span>
          {type && <span className={styles.secondary}>{type}</span>}
          {location && <span className={styles.secondary}>{location}</span>}
        </span>
        <StatusChip status={m.status} />
      </Link>
    </li>
  );
}

function MissionsPage() {
  const [filter, query, update] = useFilter();
  const shown: readonly string[] | null = filter.statuses;
  const { items, loading, error } = useMissions({
    closed: shown === null || shown.includes('closed'),
  });
  const searchText = useSearchText();
  // Nothing can be created offline.
  const offline = useOffline();
  // Keeps typing responsive with many missions.
  const deferredQuery = useDeferredValue(query);

  const missions = useMemo(() => {
    const words = deferredQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const statuses: readonly string[] | null = filter.statuses;
    return items.filter((m) => {
      if (statuses && !statuses.includes(m.status)) return false;
      if (words.length === 0) return true;
      const text = searchText(m);
      return words.every((w) => text.includes(w));
    });
  }, [items, deferredQuery, searchText, filter.statuses]);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.headingRow}>
          <h1 className={styles.heading}>Missions</h1>
          {offline ? (
            <button type="button" className={styles.create} disabled>
              <SymbolIcon name="add" />
              New
            </button>
          ) : (
            <Link to={responsivePaths.newMission} className={styles.create}>
              <SymbolIcon name="add" />
              New
            </Link>
          )}
        </div>
        <input
          type="search"
          className={styles.search}
          placeholder="Search missions"
          aria-label="Search missions"
          value={query}
          onChange={(e) => update({ q: e.target.value })}
        />
        <div className={styles.filters} role="group" aria-label="Status">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`${styles.filter}${f === filter ? ` ${styles.selected}` : ''}`}
              aria-pressed={f === filter}
              onClick={() => update({ status: f.value })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : loading ? (
        <Spinner />
      ) : missions.length === 0 ? (
        <p className={styles.empty}>
          {query ? 'No missions match the search.' : `No ${filter.label.toLowerCase()} missions.`}
        </p>
      ) : (
        <ul className={styles.list}>
          {missions.map((m) => (
            <MissionRow key={m.id} mission={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default MissionsPage;
