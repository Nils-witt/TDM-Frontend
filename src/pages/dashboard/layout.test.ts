import { describe, expect, it } from 'vitest';
import { defaultItem, itemIds, withItemIds } from './layout';

describe('itemIds', () => {
  it('uses the stored ID, else the position', () => {
    expect(itemIds([{ widget: 'a', id: 'x' }, { widget: 'b' }, { widget: 'c', id: '' }])).toEqual([
      'x',
      '1',
      '2',
    ]);
  });

  it('makes duplicates unique, the same on every call', () => {
    const items = [
      { widget: 'a', id: 'x' },
      { widget: 'b', id: 'x' },
      { widget: 'c', id: 'x' },
    ];
    expect(itemIds(items)).toEqual(['x', 'x.1', 'x.2']);
    expect(itemIds(items)).toEqual(itemIds(items));
  });

  it('does not collide with a position', () => {
    expect(itemIds([{ widget: 'a' }, { widget: 'b', id: '0' }])).toEqual(['0', '0.1']);
  });
});

describe('withItemIds', () => {
  it('stores the IDs and keeps items that have theirs', () => {
    const kept = { widget: 'a', id: 'x' };
    const out = withItemIds([kept, { widget: 'b' }]);
    expect(out[0]).toBe(kept);
    expect(out[1]).toEqual({ widget: 'b', id: '1' });
  });
});

describe('defaultItem', () => {
  it('clamps the default size to the bounds', () => {
    const item = defaultItem('Map', {
      minWidth: 10,
      maxWidth: 20,
      minHeight: 5,
      maxHeight: 50,
      defaultWidth: 30,
      defaultHeight: 2,
    });
    expect(item).toMatchObject({ widget: 'Map', left: 0, top: 0, width: 20, height: 5 });
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
