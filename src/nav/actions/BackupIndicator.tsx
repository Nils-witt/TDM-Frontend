import { useState } from 'react';
import {
  type BackupInstanceStatus,
  type BackupJob,
  type BackupLevel,
  type BackupState,
  summarizeBackup,
  useBackupStatus,
} from '@/api/backup';
import { BackupIcon, ChevronRightIcon } from '@/components/icons.tsx';
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

// An instance's dot shows its summary in the colors of the run states.
const levelState: Record<BackupLevel, BackupState> = {
  good: 'ok',
  degraded: 'incomplete',
  failed: 'failed',
};

// Shown only when admins configured a go-backup-tool instance. While the API
// cannot be reached, the last answer stays listed below the error.
function BackupIndicator() {
  const { data, error, reload } = useBackupStatus();
  if (!data?.enabled) return null;

  // A copy stored by an older version has no instances.
  const instances = data.instances ?? [];
  const summary = summarizeBackup(instances, error !== null);
  const title =
    error !== null
      ? 'Backups: status unavailable'
      : summary.level === 'good'
        ? 'Backups: all good'
        : summary.level === 'failed'
          ? 'Backups: all failed'
          : summary.failing === 0
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
      </div>
      <div className={styles.instances}>
        {instances.map((instance, i) => (
          <Instance key={instance.id} instance={instance} first={i === 0} />
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

function Instance({ instance, first }: { instance: BackupInstanceStatus; first: boolean }) {
  const { level } = summarizeBackup([instance], false);
  return (
    <section>
      {!first && <MenuSeparator />}
      <div className={styles.instanceHeading}>
        <Dot state={levelState[level]} />
        <span>{instance.name}</span>
      </div>
      {instance.error ? (
        <div className={`${styles.error} ${styles.instanceNote}`}>{instance.error}</div>
      ) : instance.jobs.length === 0 ? (
        <div className={`${styles.muted} ${styles.instanceNote}`}>No configured job found</div>
      ) : (
        instance.jobs.map((job) => <Job key={job.name} job={job} />)
      )}
    </section>
  );
}

// A job's targets stay hidden until it is clicked, so the menu lists the jobs
// at a glance.
function Job({ job }: { job: BackupJob }) {
  const [expanded, setExpanded] = useState(false);
  const lastRun = job.last_end ? formatTime(job.last_end) : 'never';
  return (
    <>
      <MenuItem
        keepOpen
        expanded={expanded}
        icon={<Dot state={job.state} />}
        title={job.error}
        trailing={
          <span className={styles.jobTrailing}>
            <span className={styles.muted}>
              {stateLabels[job.state] ?? job.state} · last run {lastRun}
            </span>
            <span className={`${styles.chevron}${expanded ? ` ${styles.expanded}` : ''}`}>
              <ChevronRightIcon />
            </span>
          </span>
        }
        onClick={() => setExpanded((e) => !e)}
      >
        {job.name}
      </MenuItem>
      {expanded && (
        <div className={styles.targets}>
          {job.error && <div className={styles.error}>{job.error}</div>}
          {job.targets.length === 0 && <div className={styles.muted}>No targets</div>}
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
        </div>
      )}
    </>
  );
}

function Dot({ state }: { state: BackupState }) {
  return <span className={`${styles.dot} ${styles[state] ?? ''}`} aria-hidden="true" />;
}

export default BackupIndicator;
