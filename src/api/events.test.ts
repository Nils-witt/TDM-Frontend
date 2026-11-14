import { describe, expect, it } from 'vitest';
import { changedPaths, everything } from './events';

describe('changedPaths', () => {
  it('matches the paths of the changed types and the audit log', () => {
    const changed = changedPaths(['missions']);
    expect(changed('/api/v1/missions')).toBe(true);
    expect(changed('/api/v1/missions?status=active')).toBe(true);
    expect(changed('/api/v1/missions/42')).toBe(true);
    expect(changed('/api/v1/audit-log?before=x')).toBe(true);
    expect(changed('/api/v1/missions-archive')).toBe(false);
    expect(changed('/api/v1/tasks')).toBe(false);
  });

  it('reloads related paths', () => {
    expect(changedPaths(['users'])('/api/v1/groups')).toBe(true);
    expect(changedPaths(['backup_instances'])('/api/v1/backup-status')).toBe(true);
  });

  it('reloads everything for an unknown type', () => {
    expect(changedPaths(['missions', 'new_table'])).toBe(everything);
  });
});
