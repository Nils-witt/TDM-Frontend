import { describe, expect, it } from 'vitest';
import type { MedicalCategory } from '@/api/medicalCategories';
import type { UhsStatisticsEntry } from '@/api/uhsStatistics';
import { formatMinutes, medicalRows, totalsOf, windowHours } from './uhsStatistics';

const entry = (
  uhs: string,
  over: {
    current?: Partial<UhsStatisticsEntry['current']>;
    window?: Partial<UhsStatisticsEntry['window']>;
  },
): UhsStatisticsEntry => ({
  uhs,
  name: uhs,
  active: true,
  current: {
    total: 0,
    arrived: 0,
    inbound: 0,
    critical: { red: 0, yellow: 0, green: 0, not_set: 0 },
    medical: [],
    ...over.current,
  },
  window: {
    admitted: 0,
    checked_out: 0,
    moved_out: 0,
    removed: 0,
    transports: 0,
    avg_stay_minutes: null,
    arrivals_per_hour: [],
    ...over.window,
  },
});

const category = (id: string, name: string, parent_id: string | null = null) =>
  ({ id, name, parent_id }) as MedicalCategory;

describe('totalsOf', () => {
  it('sums the UHS and weights the mean stay by checkouts', () => {
    const t = totalsOf([
      entry('a', {
        current: {
          total: 3,
          arrived: 2,
          inbound: 1,
          critical: { red: 1, yellow: 0, green: 2, not_set: 0 },
          medical: [{ category: 'x', count: 3 }],
        },
        window: {
          admitted: 4,
          checked_out: 1,
          avg_stay_minutes: 10,
          arrivals_per_hour: [
            { hour: '2026-01-01T10:00:00.000Z', count: 1 },
            { hour: '2026-01-01T11:00:00.000Z', count: 2 },
          ],
        },
      }),
      entry('b', {
        current: {
          total: 1,
          arrived: 1,
          critical: { red: 1, yellow: 0, green: 0, not_set: 0 },
          medical: [
            { category: null, count: 1 },
            { category: 'x', count: 1 },
          ],
        },
        window: {
          checked_out: 3,
          moved_out: 1,
          transports: 2,
          avg_stay_minutes: 30,
          arrivals_per_hour: [{ hour: '2026-01-01T11:00:00.000Z', count: 1 }],
        },
      }),
      entry('c', {}),
    ]);
    expect(t.current).toEqual({
      total: 4,
      arrived: 3,
      inbound: 1,
      critical: { red: 2, yellow: 0, green: 2, not_set: 0 },
      medical: [
        { category: 'x', count: 4 },
        { category: null, count: 1 },
      ],
    });
    expect(t.window).toMatchObject({
      admitted: 4,
      checked_out: 4,
      moved_out: 1,
      transports: 2,
      avg_stay_minutes: 25,
    });
    expect(t.window.arrivals_per_hour).toEqual([
      { hour: '2026-01-01T10:00:00.000Z', count: 1 },
      { hour: '2026-01-01T11:00:00.000Z', count: 3 },
    ]);
  });

  it('has no mean stay without checkouts', () => {
    expect(totalsOf([entry('a', {})]).window.avg_stay_minutes).toBeNull();
  });
});

describe('medicalRows', () => {
  it('names categories by their path, none and deleted ones too', () => {
    const categories = [category('t', 'Trauma'), category('f', 'Fracture', 't')];
    expect(
      medicalRows(
        [
          { category: 'gone', count: 1 },
          { category: null, count: 2 },
          { category: 'f', count: 2 },
        ],
        categories,
      ),
    ).toEqual([
      { key: '', label: 'None', count: 2 },
      { key: 'f', label: 'Trauma / Fracture', count: 2 },
      { key: 'gone', label: 'Unknown category', count: 1 },
    ]);
  });
});

describe('formatMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(null)).toBe('–');
    expect(formatMinutes(44.6)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(125)).toBe('2 h 5 min');
  });
});

describe('windowHours', () => {
  it('keeps an offered window, else 24', () => {
    expect(windowHours('12')).toBe(12);
    expect(windowHours(168)).toBe(168);
    expect(windowHours('5')).toBe(24);
  });
});
