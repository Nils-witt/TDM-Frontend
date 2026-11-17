import { describe, expect, it } from 'vitest';
import { emptyFilter, hasSearch } from './MissionArchive.ts';

describe('hasSearch', () => {
  it('needs a field other than status', () => {
    expect(hasSearch(emptyFilter)).toBe(false);
    expect(hasSearch({ ...emptyFilter, status: 'closed' })).toBe(false);
    expect(hasSearch({ ...emptyFilter, text: '   ' })).toBe(false);
    expect(hasSearch({ ...emptyFilter, text: 'fire' })).toBe(true);
    expect(hasSearch({ ...emptyFilter, status: 'closed', createdFrom: '2026-01-01' })).toBe(true);
  });
});
