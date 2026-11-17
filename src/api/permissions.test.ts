import { describe, expect, it } from 'vitest';
import { impliedBy, type PermissionInfo } from './permissions';

const p = (name: string, implies: string[] = []): PermissionInfo => ({
  name,
  area: name.split('.')[0] ?? name,
  kind: 'functional',
  implies,
  requires: [],
  description: '',
});

describe('impliedBy', () => {
  it('follows the implications transitively', () => {
    const catalog = [p('m.manage', ['m.edit']), p('m.edit', ['m.view']), p('m.view')];
    expect([...impliedBy(catalog, ['m.manage'])].toSorted()).toEqual(['m.edit', 'm.view']);
    expect([...impliedBy(catalog, ['m.view'])]).toEqual([]);
    expect([...impliedBy(catalog, ['unknown'])]).toEqual([]);
  });
});
