import { describe, expect, it } from 'vitest';
import {
  matchMissionTypes,
  type MissionTypeOption,
  resolveMissionType,
} from './missionTypeOptions';

const option = (id: string, group: string, name: string, description = ''): MissionTypeOption => ({
  id,
  label: `${group} / ${name}`,
  name,
  group,
  description,
});
const options = [
  option('1', 'Fire', 'Car', 'vehicle on fire'),
  option('2', 'Fire', 'Building'),
  option('3', 'Rescue', 'Car crash'),
  option('4', 'Rescue', 'Building'),
];

describe('matchMissionTypes', () => {
  it('needs every word somewhere in group, type or description', () => {
    expect(matchMissionTypes(options, 'fire vehicle').map((o) => o.id)).toEqual(['1']);
    expect(matchMissionTypes(options, 'rescue/building').map((o) => o.id)).toEqual(['4']);
  });

  it('lists types whose name starts with the text first', () => {
    expect(matchMissionTypes(options, 'car').map((o) => o.id)).toEqual(['1', '3']);
    expect(matchMissionTypes(options, 'crash').map((o) => o.id)).toEqual(['3']);
    expect(matchMissionTypes(options, 'fire').map((o) => o.id)).toEqual(['1', '2']);
  });

  it('returns everything for blank text', () => {
    expect(matchMissionTypes(options, '  ')).toBe(options);
  });
});

describe('resolveMissionType', () => {
  it('resolves a label, however spaced', () => {
    expect(resolveMissionType(options, 'fire/building')?.id).toBe('2');
    expect(resolveMissionType(options, ' Rescue  /  Building ')?.id).toBe('4');
  });

  it('resolves a name only when no other group has it', () => {
    expect(resolveMissionType(options, 'car')?.id).toBe('1');
    expect(resolveMissionType(options, 'building')).toBeUndefined();
    expect(resolveMissionType(options, '')).toBeUndefined();
  });
});
