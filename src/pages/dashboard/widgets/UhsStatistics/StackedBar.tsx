import { criticalCategoryLabel, type PatientCriticalCategory } from '@/api/patients';
import { triageOrder } from './uhsStatistics';
import styles from './UhsStatistics.module.scss';

type Counts = Record<PatientCriticalCategory, number>;

const describe = (counts: Counts) =>
  triageOrder.map((c) => `${criticalCategoryLabel(c)} ${counts[c] ?? 0}`).join(', ');

// The patients per triage category as one bar, most urgent first. The
// counts are in its label and title, so it does not rest on color alone.
function StackedBar({ counts }: { counts: Counts }) {
  const total = triageOrder.reduce((n, c) => n + (counts[c] ?? 0), 0);
  const label = describe(counts);
  return (
    <div className={styles.stacked} role="img" aria-label={label} title={label}>
      {total > 0 &&
        triageOrder.map((c) =>
          counts[c] ? (
            <span
              key={c}
              className={styles[c]}
              style={{ width: `${(counts[c] / total) * 100}%` }}
            />
          ) : null,
        )}
    </div>
  );
}

// The categories with their counts below a StackedBar.
export function TriageLegend({ counts }: { counts: Counts }) {
  return (
    <ul className={styles.legend}>
      {triageOrder.map((c) => (
        <li key={c}>
          <span className={`${styles.swatch} ${styles[c]}`} aria-hidden />
          {criticalCategoryLabel(c)}: {counts[c] ?? 0}
        </li>
      ))}
    </ul>
  );
}

export default StackedBar;
