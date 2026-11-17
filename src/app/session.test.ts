import { describe, expect, it } from 'vitest';
import type { Principal } from '@/api/auth';
import { hasPermission } from './session';

const principal = (permissions?: string[]): Principal =>
  ({ sub: 'u', username: 'u', name: 'U', groups: [], permissions }) as unknown as Principal;

describe('hasPermission', () => {
  it('grants admins everything', () => {
    expect(hasPermission(principal(['admin']), 'patients.edit')).toBe(true);
  });

  it('follows grants and what they imply', () => {
    expect(hasPermission(principal(['patients.edit']), 'patients.view')).toBe(true);
    expect(hasPermission(principal(['patients.archive.view']), 'patients.view')).toBe(true);
    expect(hasPermission(principal(['patients.view']), 'patients.edit')).toBe(false);
    expect(hasPermission(principal(['patients.edit']), 'patients.archive.view')).toBe(false);
    expect(hasPermission(principal(), 'patients.view')).toBe(false);
  });
});
