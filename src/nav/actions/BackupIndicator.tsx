import {
  type BackupJob,
  type BackupLevel,
  type BackupState,
  summarizeBackup,
  useBackupStatus,
} from '@/api/backup';
import { BackupIcon } from '@/components/icons.tsx';
import Menu from '@/components/menu/Menu.tsx';
import MenuItem from '@/components/menu/MenuItem.tsx';
import MenuSeparator from '@/components/menu/MenuSeparator.tsx';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import styles from './BackupIndicator.module.scss';

const stateLabels: Record<BackupState, string> = {
  idle: 'Not run yet',
  running: 'Running',
  ok: 'OK',
  incomplete: 'Incomplete',
  failed: 'Failed',
};

const levelClass: Record<BackupLevel, string> = {
  good: styles.good,
  degraded: styles.degraded,
  failed: styles.failed,
};

// Shown only when the API has a go-backup-tool instance configured
// (BACKUP_STATUS_URL). While it cannot be reached, the last answer stays
// listed below the error.
function BackupIndicator() {
  const { data, error, reload } = useBackupStatus();
  if (!data?.enabled) return null;

  const summary = summarizeBackup(data.jobs, error !== null);
  const title =
    error !== null
      ? 'Backups: backup server unreachable'
      : summary.level === 'good'
        ? 'Backups: all good'
        : summary.level === 'failed'
          ? 'Backups: all failed'
          : data.jobs.length === 0
            ? 'Backups: no configured job found'
            : `Backups: ${summary.failing} of ${summary.total} failing`;

  return (
    <Menu
      trigger={<BackupIcon />}
      className={`${styles.indicator} ${levelClass[summary.level]}`}
      label={title}
      title={title}
    >
      <div className={styles.details}>
        <div className={styles.heading}>{title}</div>
        {error !== null && <div className={styles.error}>{error}</div>}
        {data.jobs.map((job) => (
          <Job key={job.name} job={job} />
        ))}
      </div>
      <MenuSeparator />
      <MenuItem
        keepOpen
        trailing={
          data.checked_at && (
            <span className={styles.muted}>Checked {formatTime(data.checked_at)}</span>
          )
        }
        onClick={() => void reload()}
      >
        Refresh
      </MenuItem>
    </Menu>
  );
}

function Job({ job }: { job: BackupJob }) {
  const lastRun = job.last_end ? formatTime(job.last_end) : 'never';
  return (
    <section className={styles.job}>
      <div className={styles.jobHeader} title={job.error}>
        <Dot state={job.state} />
        <span className={styles.jobName}>{job.name}</span>
        <span className={styles.muted}>
          {stateLabels[job.state] ?? job.state} · last run {lastRun}
        </span>
      </div>
      {job.error && <div className={styles.error}>{job.error}</div>}
      {job.targets.map((t) => (
        <div key={`${t.server}/${t.bucket}`} className={styles.target} title={t.error}>
          <Dot state={t.state} />
          <span className={styles.targetName}>
            {t.server} / {t.bucket}
          </span>
          <span className={styles.muted}>{stateLabels[t.state] ?? t.state}</span>
          {t.error && <div className={styles.targetError}>{t.error}</div>}
        </div>
      ))}
    </section>
  );
}

function Dot({ state }: { state: BackupState }) {
  return <span className={`${styles.dot} ${styles[state] ?? ''}`} aria-hidden="true" />;
}

export default BackupIndicator;
