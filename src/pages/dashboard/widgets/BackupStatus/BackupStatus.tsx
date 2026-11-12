import { Fragment, useState } from 'react';
import {
  type BackupInstanceStatus,
  type BackupJob,
  type BackupState,
  summarizeBackup,
  useBackupStatus,
} from '@/api/backup';
import { SectionHeading } from '@/components/form';
import { ChevronRightIcon } from '@/components/icons';
import Spinner from '@/components/Spinner';
import { backupLevelState, backupStateLabels, backupTitle } from '@/nav/actions/backupLabels';
import { formatTime } from '../shared/logbookEntries';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState } from '../shared/WidgetStates';
import tableStyles from '../shared/CatalogManager.module.scss';
import styles from './BackupStatus.module.scss';

// The menu bar's BackupIndicator as a widget, with each job's schedule and
// size in a table. While the API cannot be reached, the last answer stays
// listed below the error.
function BackupStatus() {
  const { data, error, reload } = useBackupStatus();

  const actions = (
    <WidgetActionBar label="Backup status actions">
      <WidgetAction onClick={() => void reload()}>Refresh</WidgetAction>
    </WidgetActionBar>
  );

  if (!data) {
    return (
      <>
        {actions}
        {error === null ? <Spinner compact /> : <p className={styles.error}>{error}</p>}
      </>
    );
  }
  if (!data.enabled) {
    return (
      <>
        {actions}
        <EmptyState>No backup server is configured.</EmptyState>
      </>
    );
  }

  // A copy stored by an older version has no instances.
  const instances = data.instances ?? [];
  const summary = summarizeBackup(instances, error !== null);
  return (
    <>
      {actions}
      <div className={styles.summary}>
        <Dot state={backupLevelState[summary.level]} />
        <strong>{backupTitle(summary, error !== null)}</strong>
        {data.checked_at && <span className="muted">Checked {formatTime(data.checked_at)}</span>}
      </div>
      {error !== null && <p className={styles.error}>{error}</p>}
      {instances.map((instance) => (
        <Instance key={instance.id} instance={instance} />
      ))}
    </>
  );
}

function Instance({ instance }: { instance: BackupInstanceStatus }) {
  const { level } = summarizeBackup([instance], false);
  return (
    <section className="mt">
      <SectionHeading className={styles.instanceHeading}>
        <Dot state={backupLevelState[level]} />
        {instance.name}
      </SectionHeading>
      {instance.error ? (
        <p className={styles.error}>{instance.error}</p>
      ) : instance.jobs.length === 0 ? (
        <EmptyState className="">No configured job found.</EmptyState>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Job</th>
                <th>State</th>
                <th>Last run</th>
                <th>Next run</th>
                <th>Interval</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {instance.jobs.map((job) => (
                <Job key={job.name} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// A job's targets stay hidden until its row is clicked, so the table lists
// the jobs at a glance.
function Job({ job }: { job: BackupJob }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Fragment>
      <tr className={styles.jobRow} onClick={() => setExpanded((e) => !e)}>
        <td>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((x) => !x);
            }}
          >
            <span className={`${styles.chevron}${expanded ? ` ${styles.expanded}` : ''}`}>
              <ChevronRightIcon />
            </span>
            {job.name}
          </button>
          {job.kind && <span className={tableStyles.meta}> {job.kind}</span>}
        </td>
        <td title={job.error}>
          <span className={styles.state}>
            <Dot state={job.state} />
            {backupStateLabels[job.state] ?? job.state}
          </span>
        </td>
        <td className={styles.nowrap}>
          {job.last_end ? formatTime(job.last_end) : job.last_start ? '–' : 'never'}
        </td>
        <td className={styles.nowrap}>{job.next_run ? formatTime(job.next_run) : '–'}</td>
        <td>{job.interval || '–'}</td>
        <td>{job.size || '–'}</td>
      </tr>
      {expanded && (
        <tr className={styles.targetsRow}>
          <td colSpan={6}>
            <div className={styles.targets}>
              {job.error && <div className={styles.error}>{job.error}</div>}
              {job.last_start && (
                <div className="muted">Last started {formatTime(job.last_start)}</div>
              )}
              {job.targets.length === 0 && <div className="muted">No targets</div>}
              {job.targets.map((t) => (
                <div key={`${t.server}/${t.bucket}`} className={styles.target}>
                  <Dot state={t.state} />
                  <span className={styles.targetName}>
                    {t.server} / {t.bucket}
                    {t.kind && <span className={tableStyles.meta}> {t.kind}</span>}
                  </span>
                  <span className="muted">{backupStateLabels[t.state] ?? t.state}</span>
                  {t.error && <div className={styles.targetError}>{t.error}</div>}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function Dot({ state }: { state: BackupState }) {
  return <span className={`${styles.dot} ${styles[state] ?? ''}`} aria-hidden="true" />;
}

export default BackupStatus;
