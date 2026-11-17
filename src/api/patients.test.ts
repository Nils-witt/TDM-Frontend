import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { getResource } from './offlineStore';
import {
  formatPatientName,
  linkBlocker,
  localDate,
  type Patient,
  patientAge,
  patientsListPath,
  unlinkBlocker,
} from './patients';
import { createResourceCache } from './resource';

const patient = (over: Partial<Patient> = {}): Patient => ({
  id: 'p1',
  first_name: 'Jane',
  last_name: 'Doe',
  birth_date: '1980-05-17',
  event: null,
  missions: ['m1', 'm2'],
  closed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: 'a',
  updated_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'a',
  ...over,
});

describe('patientsListPath', () => {
  it('leaves out empty filters', () => {
    expect(patientsListPath({})).toBe('/api/v1/patients');
    expect(patientsListPath({ q: '  ', event: '', closed: false })).toBe('/api/v1/patients');
  });

  it('maps the scope: an ID, global for Default, nothing for Global', () => {
    expect(patientsListPath({ scope: 's1' })).toBe('/api/v1/patients?scope=s1');
    expect(patientsListPath({ scope: null })).toBe('/api/v1/patients?scope=global');
    expect(patientsListPath({ scope: undefined })).toBe('/api/v1/patients');
  });

  it('encodes every filter', () => {
    expect(patientsListPath({ mission: 'm1', q: ' Doe, Jane ', event: 'run', closed: true })).toBe(
      '/api/v1/patients?mission=m1&q=Doe%2C+Jane&event=run&closed=true',
    );
  });
});

describe('formatPatientName', () => {
  it('puts the last name first and names an unknown patient', () => {
    expect(formatPatientName(patient())).toBe('Doe, Jane');
    expect(formatPatientName(patient({ first_name: null }))).toBe('Doe');
    expect(formatPatientName(patient({ first_name: null, last_name: null }))).toBe('Unknown');
  });
});

describe('patientAge', () => {
  it('counts whole years', () => {
    expect(patientAge('1980-05-17', '2026-05-16')).toBe(45);
    expect(patientAge('1980-05-17', '2026-05-17')).toBe(46);
    expect(patientAge(null, '2026-05-17')).toBeNull();
    expect(patientAge('garbage', '2026-05-17')).toBeNull();
  });

  it('formats the local date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('link rules', () => {
  it('keeps the last link and freezes closed missions', () => {
    expect(unlinkBlocker(patient(), { status: 'open' })).toBeNull();
    expect(unlinkBlocker(patient({ missions: ['m1'] }), { status: 'open' })).toMatch(
      /at least one/,
    );
    expect(unlinkBlocker(patient(), { status: 'closed' })).toMatch(/closed/);
  });

  it('links only to open missions not yet linked', () => {
    expect(linkBlocker(patient(), { id: 'm3', status: 'open' })).toBeNull();
    expect(linkBlocker(patient(), { id: 'm1', status: 'open' })).toMatch(/Already/);
    expect(linkBlocker(patient(), { id: 'm3', status: 'closed' })).toMatch(/closed/);
  });
});

describe('offline', () => {
  it('never stores a patients path, even in a persisting cache', async () => {
    const cache = createResourceCache({ persist: true });
    const path = patientsListPath({ mission: 'm1' });
    const fetch = vi.fn(() => Promise.resolve([patient()]));
    await cache.load(path, fetch, { persist: false });
    expect(cache.state(path).data).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 10));
    expect(await getResource(path)).toBeUndefined();
  });
});

describe('patientScope', async () => {
  const { patientScope } = await import('@/pages/dashboard/widgets/Patients/patientScope');
  it('sends the tab scope, Default as null, and none for Global or all scopes', () => {
    expect(patientScope({ global: false, scopeId: 's1' }, true)).toBe('s1');
    expect(patientScope({ global: false, scopeId: null }, true)).toBeNull();
    expect(patientScope({ global: true, scopeId: null }, true)).toBeUndefined();
    expect(patientScope({ global: false, scopeId: 's1' }, false)).toBeUndefined();
  });
});
