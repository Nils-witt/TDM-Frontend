import { afterEach, describe, expect, it, vi } from 'vitest';
import { changedPaths } from './events';
import {
  arriveBlocker,
  checkoutBlocker,
  isHistoricPatient,
  isInbound,
  isWalkIn,
  type Patient,
  patientsApi,
  patientsListPath,
  stayArrivalLabel,
  stayEndLabel,
  uhsArrival,
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

describe('arrivals', () => {
  const inbound = patient({ uhs: { ...inTent, arrived_at: null } });
  const arrived = patient({ uhs: { ...inTent, arrived_at: '2026-01-01T10:30:00.000Z' } });

  it('tells inbound patients, counting an older API as arrived', () => {
    expect(isInbound(inbound)).toBe(true);
    expect(isInbound(arrived)).toBe(false);
    expect(isInbound(patient({ uhs: inTent }))).toBe(false);
    expect(isInbound(patient())).toBe(false);
    expect(uhsArrival(inbound)).toBeNull();
    expect(uhsArrival(arrived)).toBe('2026-01-01T10:30:00.000Z');
    expect(uhsArrival(patient({ uhs: inTent }))).toBe(inTent.since);
  });

  it('marks only an inbound patient, also in an UHS session', () => {
    expect(arriveBlocker(inbound, { ...ctx, uhsSession: true })).toBeNull();
    expect(arriveBlocker(arrived, ctx)).toMatch(/already/);
    expect(arriveBlocker(patient(), ctx)).toMatch(/no UHS/);
    expect(arriveBlocker(inbound, { ...ctx, offline: true })).toMatch(/offline/);
    expect(arriveBlocker(inbound, { ...ctx, canEdit: false })).toMatch(/patients\.edit/);
  });

  it('labels the arrival of a stay', () => {
    const stay = {
      id: 's',
      uhs: 'u1',
      uhs_name: 'Tent',
      assigned_at: 'A',
      released_at: null,
      release_reason: null,
      created_by: 'd',
    };
    const fmt = (ts: string) => `<${ts}>`;
    expect(stayArrivalLabel({ ...stay, arrived_at: 'B', arrived_by: 'medic' }, fmt)).toBe(
      '<B> (medic)',
    );
    expect(stayArrivalLabel({ ...stay, arrived_at: null, arrived_by: null }, fmt)).toBe('Inbound');
    expect(
      stayArrivalLabel({ ...stay, released_at: 'C', arrived_at: null, arrived_by: null }, fmt),
    ).toBe('Not arrived');
    expect(stayArrivalLabel(stay, fmt)).toBe('<A>');
  });
});

describe('checkouts', () => {
  const inbound = patient({ uhs: { ...inTent, arrived_at: null } });
  const arrived = patient({ uhs: { ...inTent, arrived_at: '2026-01-01T10:30:00.000Z' } });

  it('checks out only a patient that arrived, also in an UHS session', () => {
    expect(checkoutBlocker(arrived, ctx)).toBeNull();
    expect(checkoutBlocker(patient({ uhs: inTent }), ctx)).toBeNull();
    expect(checkoutBlocker(inbound, ctx)).toMatch(/not arrived/);
    expect(checkoutBlocker(patient(), ctx)).toMatch(/no UHS/);
    expect(checkoutBlocker(arrived, { ...ctx, offline: true })).toMatch(/offline/);
    expect(checkoutBlocker(arrived, { ...ctx, canEdit: false })).toMatch(/patients\.edit/);
  });

  it('labels how a stay ended', () => {
    const stay = {
      id: 's',
      uhs: 'u1',
      uhs_name: 'Tent',
      assigned_at: 'A',
      released_at: 'B',
      release_reason: null,
      created_by: 'd',
    };
    expect(stayEndLabel({ ...stay, checked_out_by: 'medic' })).toBe('Checked out (medic)');
    expect(stayEndLabel({ ...stay, release_reason: 'Never came' })).toBe('Removed: Never came');
    expect(stayEndLabel(stay)).toBe('');
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
    await patientsApi.releaseUhs('p1', 'Went home');
    await patientsApi.arriveUhs('p1');
    await patientsApi.checkoutUhs('p1');
    expect(calls.map((c) => [c.url.replace(/^.*\/api/, '/api'), c.method])).toEqual([
      ['/api/v1/patients/p1/uhs', 'PUT'],
      ['/api/v1/patients/p1/uhs', 'DELETE'],
      ['/api/v1/patients/p1/uhs/arrival', 'POST'],
      ['/api/v1/patients/p1/uhs/checkout', 'POST'],
    ]);
    expect(JSON.parse(String(calls[0]?.body))).toEqual({ uhs: 'u1' });
    expect(JSON.parse(String(calls[1]?.body))).toEqual({ reason: 'Went home' });
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
