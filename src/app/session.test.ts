import { describe, expect, it } from 'vitest';
import type { Principal } from '@/api/auth';
import { allowedViews, can, hasPermission } from './session';

const principal = (personal: string[], functional: string[] = []): Principal => ({
  sub: 'u',
  username: 'u',
  name: 'U',
  groups: [],
  admin: false,
  permissions: { personal, functional },
  session: null,
  views: null,
});

describe('hasPermission', () => {
  it('looks up the effective permissions of both kinds', () => {
    expect(hasPermission(principal([], ['patients.view']), 'patients.view')).toBe(true);
    expect(hasPermission(principal(['audit.view']), 'audit.view')).toBe(true);
    expect(hasPermission(principal(['audit.view']), 'patients.view')).toBe(false);
  });

  it('gives a hint when missing', () => {
    expect(can(principal([]), 'missions.edit')).toEqual({
      allowed: false,
      hint: expect.stringContaining('missions.edit') as string,
    });
    expect(can(principal([], ['missions.edit']), 'missions.edit').allowed).toBe(true);
  });
});

describe('allowedViews', () => {
  it('allows everything without views', () => {
    const v = allowedViews(principal([]));
    expect(v.desktop && v.responsive).toBe(true);
    expect([...v.pages]).toEqual(['missions', 'archive', 'map', 'reports', 'messages']);
  });

  it('follows the function, in the canonical order', () => {
    const v = allowedViews({
      ...principal([]),
      views: { desktop: false, responsive: true, responsive_pages: ['map', 'missions', 'x'] },
    });
    expect(v).toMatchObject({ desktop: false, responsive: true });
    expect([...v.pages]).toEqual(['missions', 'map']);
  });

  it('lets the UHS page through only when the function has it', () => {
    const v = allowedViews({
      ...principal([]),
      views: { desktop: false, responsive: true, responsive_pages: ['uhs'] },
    });
    expect([...v.pages]).toEqual(['uhs']);
  });

  it('keeps the desktop when no view is allowed', () => {
    const v = allowedViews({
      ...principal([]),
      views: { desktop: false, responsive: false, responsive_pages: [] },
    });
    expect(v.desktop).toBe(true);
  });
});
