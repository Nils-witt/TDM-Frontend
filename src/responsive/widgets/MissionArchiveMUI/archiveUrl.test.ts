import { describe, expect, it } from 'vitest';
import {
  defaultSort,
  emptyFilter,
  type ArchiveQuery,
} from '@/pages/dashboard/widgets/MissionArchive/MissionArchive';
import { fromParams, toParams } from './archiveUrl';

const query = ({
  filter,
  ...q
}: Partial<Omit<ArchiveQuery, 'filter'>> & { filter?: Partial<ArchiveQuery['filter']> } = {}) => ({
  sort: defaultSort,
  page: 1,
  ...q,
  filter: { ...emptyFilter, status: 'done', ...filter },
});

describe('archive URL', () => {
  it('leaves the defaults out', () => {
    expect(toParams(query(), 'done').toString()).toBe('');
  });

  it('round-trips filter, sort and page', () => {
    const q = query({
      filter: { text: 'fire', city: 'Bonn', status: '' },
      sort: { key: 'city', descending: false },
      page: 3,
    });
    const p = toParams(q, 'done');
    expect(p.get('q')).toBe('fire');
    expect(p.get('status')).toBe('');
    expect(fromParams(p, 'done')).toEqual(q);
  });

  it('keeps the default column with a changed order', () => {
    const q = query({ sort: { ...defaultSort, descending: !defaultSort.descending } });
    const p = toParams(q, 'done');
    expect(p.has('sort')).toBe(false);
    expect(fromParams(p, 'done').sort).toEqual(q.sort);
  });

  it('ignores an unknown sort column and a bad page', () => {
    const q = fromParams(new URLSearchParams('sort=nope&page=-4'), 'done');
    expect(q.sort).toEqual(defaultSort);
    expect(q.page).toBe(1);
    expect(fromParams(new URLSearchParams('page=2.7'), 'done').page).toBe(2);
  });

  it('starts with the initial status', () => {
    expect(fromParams(new URLSearchParams(), 'active').filter.status).toBe('active');
  });
});
