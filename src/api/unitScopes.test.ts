import { describe, expect, it } from 'vitest';
import type { MissionScope } from './catalogs';
import { type UnitScope, unitScopeOf } from './unitScopes';

const byUnit = new Map([
  ['u1', { unit_id: 'u1', scope: 's1' }],
  ['u2', { unit_id: 'u2', scope: 'gone' }],
] as unknown as [string, UnitScope][]);
const scopes = new Map([['s1', { id: 's1', name: 'North' }]] as unknown as [
  string,
  MissionScope,
][]);

describe('unitScopeOf', () => {
  it('returns the unit scope while the catalog has it', () => {
    expect(unitScopeOf(byUnit, scopes, 'u1')).toBe('s1');
  });

  it('counts a deleted scope and no row as Default', () => {
    expect(unitScopeOf(byUnit, scopes, 'u2')).toBeNull();
    expect(unitScopeOf(byUnit, scopes, 'u3')).toBeNull();
  });
});
