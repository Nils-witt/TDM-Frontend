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
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import { backupLevelState, backupStateLabels, backupTitle } from './backupLabels';
import styles from './BackupIndicator.module.scss';

const levelClass: Record<BackupLevel, string> = {
  good: styles.good,
  degraded: styles.degraded,
  failed: styles.failed,
};

// Shown only when admins configured a go-backup-tool instance. While the API
// cannot be reached, the last answer stays listed below the error.
function BackupIndicator() {
  const { data, error, reload } = useBackupStatus();
  const { openWidget } = useWidgetWindows();
  if (!data?.enabled) return null;

  // A copy stored by an older version has no instances.
  const instances = data.instances ?? [];
  const summary = summarizeBackup(instances, error !== null);
  const title = backupTitle(summary, error !== null);

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
        {instances.map((instance) => (
          <Instance key={instance.id} instance={instance} />
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
      <MenuItem onClick={() => openWidget('BackupStatus')}>Show in Window</MenuItem>
    </Menu>
  );
}

function Instance({ instance }: { instance: BackupInstanceStatus }) {
  const { level } = summarizeBackup([instance], false);
  // The separator is a sibling of the section: as the section's first child
  // it would always be hidden, and its :first-child rule drops the one before
  // the first instance.
  return (
    <>
      <MenuSeparator />
      <section className={styles.instance}>
        <div className={styles.instanceHeading}>
          <Dot state={backupLevelState[level]} />
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
    </>
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
              {backupStateLabels[job.state] ?? job.state} · last run {lastRun}
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
              <span className={styles.muted}>{backupStateLabels[t.state] ?? t.state}</span>
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
