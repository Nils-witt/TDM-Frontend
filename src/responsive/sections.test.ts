import { describe, expect, it } from 'vitest';
import type { FunctionPage } from '@/api/sessions';
import { homePath, visibleSections } from './sections';
import { responsivePaths } from './paths';

const pages = (...p: FunctionPage[]) => new Set(p);

describe('visibleSections', () => {
  it('shows the allowed pages and always Settings', () => {
    expect(visibleSections(pages('map', 'missions')).map((s) => s.label)).toEqual([
      'Missions',
      'Map',
      'Settings',
    ]);
    expect(visibleSections(pages()).map((s) => s.label)).toEqual(['Settings']);
  });
});

describe('homePath', () => {
  it('is the first shown section', () => {
    expect(homePath(pages('missions', 'map'))).toBe(responsivePaths.missions);
    expect(homePath(pages('reports'))).toBe(responsivePaths.reports);
    expect(homePath(pages())).toBe(responsivePaths.settings);
  });
});

describe('an UHS function', () => {
  it('shows only UHS and Settings, and opens the UHS view', () => {
    expect(visibleSections(pages('uhs')).map((s) => s.label)).toEqual(['UHS', 'Settings']);
    expect(homePath(pages('uhs'))).toBe(responsivePaths.uhs);
  });
});
