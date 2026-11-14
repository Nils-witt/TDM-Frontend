import Alert from '@/components/Alert';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import { useActiveMissionsWidget } from './ActiveMissions.ts';
import styles from './ActiveMissions.module.scss';

const missions = (count: number) => (count === 1 ? 'mission' : 'missions');

// One frame shows its count large; several are listed, one row each.
function ActiveMissionsWidget({ options }: WidgetProps) {
  const { counts, error, loading } = useActiveMissionsWidget(options);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return null;
  if (counts.length === 0) return <EmptyState>No time frame set.</EmptyState>;

  if (counts.length === 1 && counts[0]) {
    const { count, period } = counts[0];
    return (
      <div className={styles.stat}>
        <span className={styles.count}>{count}</span>
        <span className={styles.label}>
          active {missions(count)} in the last {period}
        </span>
      </div>
    );
  }

  return (
    <dl className={styles.list}>
      {counts.map(({ count, period }, i) => (
        <div key={i} className={styles.row}>
          <dt className={styles.label}>Last {period}</dt>
          <dd className={styles.rowCount} aria-label={`${count} active ${missions(count)}`}>
            {count}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default ActiveMissionsWidget;
