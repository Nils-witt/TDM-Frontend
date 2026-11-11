import { lazy, Suspense, useState } from 'react';
import { type BackupLevel, summarizeBackup, useBackupStatus } from '@/api/backup';
import { BackupIcon } from '@/components/icons.tsx';
import { backupTitle } from '@/nav/actions/backupLabels';
import styles from './BackupStatus.module.scss';

// The dialog's MUI parts load only once it is opened.
const BackupStatusDialogMUI = lazy(() => import('./BackupStatusDialogMUI'));

const levelClass: Record<BackupLevel, string> = {
  good: styles.good,
  degraded: styles.degraded,
  failed: styles.failed,
};

// The header's counterpart of the menu bar's BackupIndicator: hidden unless
// admins configured a go-backup-tool instance; a tap shows the details.
function BackupStatus() {
  const status = useBackupStatus();
  const [open, setOpen] = useState(false);
  const { data, error } = status;
  if (!data?.enabled) return null;

  const summary = summarizeBackup(data.instances ?? [], error !== null);
  const title = backupTitle(summary, error !== null);

  return (
    <>
      <button
        type="button"
        className={`icon-btn ${styles.button} ${levelClass[summary.level]}`}
        aria-label={title}
        title={title}
        onClick={() => setOpen(true)}
      >
        <BackupIcon />
      </button>
      {open && (
        <Suspense fallback={null}>
          <BackupStatusDialogMUI
            status={data}
            error={error}
            title={title}
            onRefresh={() => void status.reload()}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}

export default BackupStatus;
