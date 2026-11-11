import type { BackupLevel, BackupState, BackupSummary } from '@/api/backup';

// Shared by the menu bar's BackupIndicator and the responsive UI's
// BackupStatusMUI.
export const backupStateLabels: Record<BackupState, string> = {
  idle: 'Not run yet',
  running: 'Running',
  ok: 'OK',
  incomplete: 'Incomplete',
  failed: 'Failed',
};

// An instance's dot shows its summary in the colors of the run states.
export const backupLevelState: Record<BackupLevel, BackupState> = {
  good: 'ok',
  degraded: 'incomplete',
  failed: 'failed',
};

export function backupTitle(summary: BackupSummary, unavailable: boolean): string {
  if (unavailable) return 'Backups: status unavailable';
  if (summary.level === 'good') return 'Backups: all good';
  if (summary.level === 'failed') return 'Backups: all failed';
  if (summary.failing === 0) return 'Backups: no configured job found';
  return `Backups: ${summary.failing} of ${summary.total} failing`;
}
