import { describe, expect, it } from 'vitest';
import {
  type BackupInstanceStatus,
  type BackupJob,
  type BackupState,
  summarizeBackup,
} from './backup';

const job = (state: BackupState, targets: BackupState[] = []): BackupJob => ({
  name: 'j',
  kind: 'k',
  state,
  last_start: null,
  last_end: null,
  next_run: null,
  targets: targets.map((s) => ({ server: 's', bucket: 'b', kind: 'k', state: s })),
});
const instance = (jobs: BackupJob[], error?: string): BackupInstanceStatus => ({
  id: 'i',
  name: 'i',
  jobs,
  error,
});

describe('summarizeBackup', () => {
  it('is good when nothing failed', () => {
    expect(summarizeBackup([instance([job('ok', ['ok', 'idle']), job('running')])], false)).toEqual(
      { level: 'good', failing: 0, total: 3 },
    );
  });

  it('is degraded when some targets failed', () => {
    expect(summarizeBackup([instance([job('ok', ['ok', 'failed'])])], false)).toEqual({
      level: 'degraded',
      failing: 1,
      total: 2,
    });
  });

  it('counts a job that failed before its targets as one more failure', () => {
    expect(summarizeBackup([instance([job('incomplete', ['ok'])])], false)).toEqual({
      level: 'degraded',
      failing: 1,
      total: 2,
    });
  });

  it('is failed when everything failed or the API is unreachable', () => {
    expect(summarizeBackup([instance([], 'down')], false).level).toBe('failed');
    expect(summarizeBackup([instance([job('ok')])], true).level).toBe('failed');
  });

  it('is degraded for an instance without jobs', () => {
    expect(summarizeBackup([instance([job('ok')]), instance([])], false).level).toBe('degraded');
  });
});
