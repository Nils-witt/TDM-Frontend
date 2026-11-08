import { type Mission, shortLocation } from '@/api/missions';
import Alert from '@/components/Alert';
import { StatusChip } from '../shared/MissionStatus';
import { useMissionTypeName } from '../shared/missionTypeName';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import { useMissionsListWidget } from './MissionsList.ts';
import styles from './MissionsList.module.scss';

function MissionItem({
  mission: m,
  selected,
  select,
  showStatusChip,
}: {
  mission: Mission;
  selected: boolean;
  select: (id: string) => void;
  showStatusChip: boolean;
}) {
  const type = useMissionTypeName(m.mission_type);
  const location = shortLocation(m);
  return (
    <li className={selected ? 'selected' : undefined}>
      <button type="button" aria-pressed={selected} onClick={() => select(m.id)}>
        <p className="primary">
          {type && <span className={styles.type}>{type}: </span>}
          {m.occurred_event}
          {showStatusChip && <StatusChip status={m.status} />}
        </p>
        {location && <p className="secondary">{location}</p>}
      </button>
    </li>
  );
}

function MissionList({
  missions,
  selectedId,
  select,
  showStatusChip,
}: {
  missions: readonly Mission[];
  selectedId: string | null;
  select: (id: string) => void;
  showStatusChip: boolean;
}) {
  if (missions.length === 0) return <EmptyState>No missions.</EmptyState>;
  return (
    <ul className="list select">
      {missions.map((m) => (
        <MissionItem
          key={m.id}
          mission={m}
          selected={m.id === selectedId}
          select={select}
          showStatusChip={showStatusChip}
        />
      ))}
    </ul>
  );
}

function MissionsListWidget({ options }: WidgetProps) {
  const { missions, sections, error, loading, selectedId, select } = useMissionsListWidget();

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return null;
  if (options.groupByStatus !== true) {
    return (
      <MissionList
        missions={missions}
        selectedId={selectedId}
        select={select}
        showStatusChip={true}
      />
    );
  }
  return (
    <div className={styles.sections}>
      {sections.map((s) => {
        const collapsed = options[`collapse-${s.status}`] === true;
        return (
          // Keyed by the default too, so changing the option applies it again.
          <details key={`${s.status}-${collapsed}`} className={styles.section} open={!collapsed}>
            <summary>
              <span className={styles.label}>{s.label}</span>
              <span className={styles.count}>{s.missions.length}</span>
            </summary>
            <MissionList
              missions={s.missions}
              selectedId={selectedId}
              select={select}
              showStatusChip={false}
            />
          </details>
        );
      })}
    </div>
  );
}

export default MissionsListWidget;
