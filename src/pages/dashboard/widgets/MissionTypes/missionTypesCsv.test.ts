import { describe, expect, it } from 'vitest';
import type { MissionType, MissionTypeGroup } from '@/api/catalogs';
import { planImport, readRows, toCsv } from './missionTypesCsv';

const meta = { created_at: '', updated_at: '' };
const groups = [
  { id: 'g1', name: 'Fire', ...meta },
  { id: 'g2', name: 'Empty', ...meta },
] as unknown as MissionTypeGroup[];
const types = [
  { id: 't1', group_id: 'g1', name: 'Car, small', description: 'says "hi"', ...meta },
  { id: 't2', group_id: 'g1', name: 'Building', description: null, ...meta },
] as unknown as MissionType[];

describe('toCsv', () => {
  it('quotes fields and lists groups without types', () => {
    expect(toCsv(groups, types)).toBe(
      'group,type,description\r\n' +
        'Empty,,\r\n' +
        'Fire,Building,\r\n' +
        'Fire,"Car, small","says ""hi"""\r\n',
    );
  });

  it('round-trips through readRows with any delimiter', () => {
    for (const d of [',', ';', '\t', '|'] as const) {
      const rows = readRows(toCsv(groups, types, d));
      expect(rows.map((r) => [r.group, r.type, r.description])).toEqual([
        ['Empty', '', ''],
        ['Fire', 'Building', ''],
        ['Fire', 'Car, small', 'says "hi"'],
      ]);
    }
  });
});

describe('readRows', () => {
  it('ignores a byte order mark, blank lines and the column order', () => {
    const rows = readRows('﻿type;Group\n\nCar;Fire\r\n');
    expect(rows).toEqual([{ line: 3, group: 'Fire', type: 'Car', description: null }]);
  });

  it('names every bad line', () => {
    expect(() => readRows('group,type\n,Car\nFire,Car\nfire, car\n')).toThrow(
      'Invalid CSV: line 2: group is empty; line 4: duplicate of an earlier row',
    );
  });

  it('needs the group column and a closed quote', () => {
    expect(() => readRows('type\nCar\n')).toThrow('Missing column group');
    expect(() => readRows('group\n"Fire\n')).toThrow('Unterminated');
    expect(() => readRows('')).toThrow('The file is empty');
  });
});

describe('planImport', () => {
  it('creates what is missing, updates descriptions, counts the rest', () => {
    const rows = readRows(
      'group,type,description\n' +
        'fire,building,new text\n' + // update, matched ignoring case
        'Fire,"Car, small","says ""hi"""\n' + // unchanged
        'Water,Boat,\n' + // new group and type
        'Water,Ship,x\n' + // the new group only once
        'Empty,,\n', // unchanged group
    );
    const plan = planImport(rows, groups, types);
    expect(plan.unchanged).toBe(2);
    expect(plan.steps.map((s) => [s.kind, s.name])).toEqual([
      ['create-group', 'Water'],
      ['update-type', 'Building'],
      ['create-type', 'Boat'],
      ['create-type', 'Ship'],
    ]);
    expect(plan.steps[2]).toMatchObject({ groupId: null, groupName: 'Water' });
  });

  it('changes no description without the column', () => {
    const plan = planImport(readRows('group,type\nFire,Building\n'), groups, types);
    expect(plan).toEqual({ steps: [], unchanged: 1 });
  });
});

it('counts line breaks inside quoted fields', () => {
  expect(() => readRows('group,description\nFire,"two\r\nlines"\n,x\n')).toThrow(
    'line 4: group is empty',
  );
});
