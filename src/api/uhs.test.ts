import { afterEach, describe, expect, it, vi } from 'vitest';
import { changedPaths } from './events';
import {
  isHistoricPatient,
  isWalkIn,
  type Patient,
  patientsApi,
  patientsListPath,
  uhsBlocker,
  unlinkBlocker,
} from './patients';
import { fixedScopeOf } from './sessions';

const patient = (over: Partial<Patient> = {}): Patient => ({
  id: 'p1',
  first_name: 'Jane',
  last_name: 'Doe',
  birth_date: null,
  event: null,
  missions: ['m1'],
  closed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: 'a',
  updated_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'a',
  ...over,
});

const inTent = {
  id: 'u1',
  name: 'Tent',
  active: true,
  since: '2026-01-01T10:00:00.000Z',
  in_scope: true,
};
const now = Date.parse('2026-01-02T12:00:00.000Z');
const ctx = { canEdit: true, offline: false, now };

describe('patientsListPath', () => {
  it('filters by UHS', () => {
    expect(patientsListPath({ uhs: 'u 1' })).toBe('/api/v1/patients?uhs=u+1');
  });
});

describe('uhsBlocker', () => {
  it('needs patients.edit, the API and a current patient', () => {
    expect(uhsBlocker(patient(), ctx, 'assign')).toBeNull();
    expect(uhsBlocker(patient(), { ...ctx, offline: true }, 'assign')).toMatch(/offline/);
    expect(uhsBlocker(patient(), { ...ctx, canEdit: false }, 'assign')).toMatch(/patients\.edit/);
    const old = patient({ closed_at: '2026-01-01T00:00:00.000Z' });
    expect(isHistoricPatient(old, now)).toBe(true);
    expect(uhsBlocker(old, ctx, 'assign')).toMatch(/read-only/);
  });

  it('refuses an inactive or the current UHS, and moves for UHS sessions', () => {
    const p = patient({ uhs: inTent });
    expect(uhsBlocker(p, ctx, 'assign', { id: 'u2', active: true })).toBeNull();
    expect(uhsBlocker(p, ctx, 'assign', { id: 'u2', active: false })).toMatch(/inactive/);
    expect(uhsBlocker(p, ctx, 'assign', { id: 'u1', active: true })).toMatch(/already/);
    expect(uhsBlocker(p, { ...ctx, uhsSession: true }, 'assign')).toMatch(/UHS function/);
  });

  it('releases only a patient in an UHS, also in an UHS session', () => {
    expect(uhsBlocker(patient(), ctx, 'release')).toMatch(/no UHS/);
    expect(
      uhsBlocker(patient({ uhs: inTent }), { ...ctx, uhsSession: true }, 'release'),
    ).toBeNull();
  });
});

describe('walk-ins', () => {
  it('have no missions, and the last mission may go while in an UHS', () => {
    expect(isWalkIn(patient({ missions: [] }))).toBe(true);
    expect(isWalkIn(patient({ missions: [], other_missions: [{ id: 'm', name: 'x' }] }))).toBe(
      false,
    );
    expect(unlinkBlocker(patient({ uhs: inTent }), { status: 'open' })).toBeNull();
  });
});

describe('patientsApi UHS', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('puts and deletes the stay', async () => {
    const calls: { url: string; method: string; body: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        calls.push({ url, method: init.method ?? 'GET', body: init.body });
        return Promise.resolve(
          new Response(JSON.stringify(patient()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }),
    );
    await patientsApi.assignUhs('p1', 'u1');
    await patientsApi.releaseUhs('p1');
    expect(calls.map((c) => [c.url.replace(/^.*\/api/, '/api'), c.method])).toEqual([
      ['/api/v1/patients/p1/uhs', 'PUT'],
      ['/api/v1/patients/p1/uhs', 'DELETE'],
    ]);
    expect(JSON.parse(String(calls[0]?.body))).toEqual({ uhs: 'u1' });
  });
});

describe('events', () => {
  it('reloads the UHS and patients on their types', () => {
    expect(changedPaths(['uhs'])('/api/v1/uhs?all=true')).toBe(true);
    expect(changedPaths(['patient_uhs'])('/api/v1/patients?uhs=u1')).toBe(true);
    expect(changedPaths(['patient_uhs'])('/api/v1/uhs')).toBe(true);
  });
});

describe('fixedScopeOf', () => {
  it('is the UHS scope of an UHS function', () => {
    expect(fixedScopeOf({ uhs: { id: 'u', name: 'T', scope: 's1' } })).toBe('s1');
    expect(fixedScopeOf({ uhs: { id: 'u', name: 'T', scope: null } })).toBeNull();
    expect(fixedScopeOf({ uhs: null })).toBeUndefined();
    expect(fixedScopeOf(undefined)).toBeUndefined();
  });
});
