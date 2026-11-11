import { useEffect } from 'react';
import { request } from './client';
import { useCollection } from './collection';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';
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

// error is set when the API could not read the instance; its jobs are then
// empty.
export type BackupInstanceStatus = {
  id: string;
  name: string;
  error?: string;
  jobs: BackupJob[];
};

export type BackupStatus = {
  enabled: boolean;
  checked_at: string | null;
  instances: BackupInstanceStatus[];
};

export const backupStatusPath = '/api/v1/backup-status';

// go-backup-tool's changes do not arrive on the event stream, so it is asked
// again on this interval.
const pollMs = 60_000;

// The API proxies the go-backup-tool instances, which keeps their tokens on
// the server.
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
// last ok, and so does an instance the API could not read. Idle and running
// count as fine.
export function summarizeBackup(
  instances: readonly BackupInstanceStatus[],
  unreachable: boolean,
): BackupSummary {
  let failing = 0;
  let total = 0;
  for (const instance of instances) {
    if (instance.error) {
      failing += 1;
      total += 1;
      continue;
    }
    for (const job of instance.jobs) {
      const units = job.targets.length > 0 ? job.targets : [job];
      const failedTargets = units.filter((u) => failed(u.state)).length;
      total += units.length;
      failing += failedTargets;
      if (failedTargets === 0 && (job.state === 'failed' || job.state === 'incomplete')) {
        failing += 1;
        total += 1;
      }
    }
  }
  if (unreachable || (total > 0 && failing === total)) return { level: 'failed', failing, total };
  // No job found: an instance's job list names none the server has.
  const noJobs = instances.some((i) => !i.error && i.jobs.length === 0);
  if (failing > 0 || noJobs) return { level: 'degraded', failing, total };
  return { level: 'good', failing, total };
}

// A go-backup-tool instance as the admins configure it. The API never returns
// its token; has_token tells whether one is stored.
export type BackupInstance = EntityMeta & {
  id: string;
  name: string;
  url: string;
  // The shown jobs in order; empty shows every job.
  jobs: string[];
  has_token: boolean;
};

export type BackupInstanceInput = { name: string; url: string; jobs: string[]; token: string };

export const backupInstancesPath = '/api/v1/backup-instances';

const fetchBackupInstances = listFetcher<BackupInstance>('backup_instances');

// Admins only.
export const useBackupInstances = () => useCollection(backupInstancesPath, fetchBackupInstances);

// A patch without token keeps the stored one.
export const backupInstancesApi = {
  create: (input: BackupInstanceInput) =>
    request<BackupInstance>(backupInstancesPath, { method: 'POST', body: JSON.stringify(input) }),
  patch: (id: string, input: Partial<BackupInstanceInput>) =>
    request<BackupInstance>(`${backupInstancesPath}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<void>(`${backupInstancesPath}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
