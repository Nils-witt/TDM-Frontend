import { describe, expect, it } from 'vitest';
import {
  type MedicalCategory,
  medicalCategoryPath,
  medicalCategorySubtree,
  medicalCategoryTree,
} from './medicalCategories';

const cat = (id: string, name: string, parent_id: string | null = null): MedicalCategory => ({
  id,
  name,
  parent_id,
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: 'a',
  updated_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'a',
});

const list = [
  cat('t', 'Trauma'),
  cat('o', 'Open', 'f'),
  cat('f', 'Fracture', 't'),
  cat('b', 'Burns', 't'),
  cat('i', 'Internal'),
];

describe('medicalCategoryTree', () => {
  it('lists depth first with siblings by name', () => {
    expect(medicalCategoryTree(list).map((n) => `${n.depth}${n.category.name}`)).toEqual([
      '0Internal',
      '0Trauma',
      '1Burns',
      '1Fracture',
      '2Open',
    ]);
  });

  it('keeps categories with a missing parent or in a cycle', () => {
    const odd = [cat('x', 'X', 'gone'), cat('a', 'A', 'b'), cat('b', 'B', 'a')];
    expect(medicalCategoryTree(odd).map((n) => n.category.id)).toEqual(['x', 'a', 'b']);
  });
});

describe('medicalCategoryPath', () => {
  it('joins the names from the top', () => {
    expect(medicalCategoryPath(list, 'o')).toBe('Trauma / Fracture / Open');
    expect(medicalCategoryPath(list, 'i')).toBe('Internal');
  });

  it('is null without a category or for a deleted one', () => {
    expect(medicalCategoryPath(list, null)).toBeNull();
    expect(medicalCategoryPath(list, 'gone')).toBeNull();
  });
});

describe('medicalCategorySubtree', () => {
  it('holds the category and everything below it', () => {
    expect([...medicalCategorySubtree(list, 't')].toSorted()).toEqual(['b', 'f', 'o', 't']);
    expect([...medicalCategorySubtree(list, 'o')]).toEqual(['o']);
  });
});
