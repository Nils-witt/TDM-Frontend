import { useEffect } from 'react';
import { useResource } from './resource';

// go-backup-tool's run states: idle = never run; incomplete (jobs only) =
// some targets reached, not all.
export type BackupState = 'idle' | 'running' | 'ok' | 'incomplete' | 'failed';

export type BackupTarget = {
  server: string;
  bucket: string;
  kind: string;
  state: BackupState;
  error?: string;
};

export type BackupJob = {
  name: string;
  kind: string;
  state: BackupState;
  error?: string;
  interval?: string;
  size?: string;
  last_start: string | null;
  last_end: string | null;
  next_run: string | null;
  targets: BackupTarget[];
};

export type BackupStatus = { enabled: boolean; checked_at: string | null; jobs: BackupJob[] };

const backupStatusPath = '/api/v1/backup-status';

// go-backup-tool's changes do not arrive on the event stream, so it is asked
// again on this interval.
const pollMs = 60_000;

// The API proxies go-backup-tool, which keeps its token on the server.
export function useBackupStatus() {
  const state = useResource<BackupStatus>(backupStatusPath);
  const { reload } = state;
  useEffect(() => {
    const id = setInterval(() => void reload(), pollMs);
    return () => clearInterval(id);
  }, [reload]);
  return state;
}

export type BackupLevel = 'good' | 'degraded' | 'failed';

export type BackupSummary = { level: BackupLevel; failing: number; total: number };

const failed = (s: BackupState) => s === 'failed';

// A job that failed before reaching its targets (a command failed) counts as
// one failure of its own, so it is not hidden by targets that kept their
// last ok. Idle and running count as fine.
export function summarizeBackup(jobs: readonly BackupJob[], unreachable: boolean): BackupSummary {
  let failing = 0;
  let total = 0;
  for (const job of jobs) {
    const units = job.targets.length > 0 ? job.targets : [job];
    const failedTargets = units.filter((u) => failed(u.state)).length;
    total += units.length;
    failing += failedTargets;
    if (failedTargets === 0 && (job.state === 'failed' || job.state === 'incomplete')) {
      failing += 1;
      total += 1;
    }
  }
  if (unreachable || (total > 0 && failing === total)) return { level: 'failed', failing, total };
  // No job found: BACKUP_STATUS_JOBS names none the server has.
  if (failing > 0 || jobs.length === 0) return { level: 'degraded', failing, total };
  return { level: 'good', failing, total };
}
