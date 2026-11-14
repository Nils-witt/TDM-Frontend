import { describe, expect, it } from 'vitest';
import { bundleFileName, bundleSections, parseBundle } from './configBundle';

const file = (body: object) =>
  JSON.stringify({ format: 'universam-config', version: 2, exported_at: '', ...body });

describe('parseBundle', () => {
  it('reads a valid file and lists its sections', () => {
    const b = parseBundle(
      file({
        mission_types: [{ name: 'Fire', types: ['Car', { name: 'Building', description: 'x' }] }],
        logbook_types: ['Radio'],
        map_settings: { default_overlays: ['hydrants'] },
      }),
    );
    expect(bundleSections(b)).toEqual(['mission_types', 'logbook_types', 'map_settings']);
  });

  it('accepts a version 1 file', () => {
    expect(() => parseBundle(file({ version: 1 }))).not.toThrow();
  });

  it('rejects other files', () => {
    expect(() => parseBundle('nope')).toThrow('not JSON');
    expect(() => parseBundle('{"format":"other"}')).toThrow('not a Universam configuration');
    expect(() => parseBundle(file({ version: 3 }))).toThrow('Unsupported version 3');
  });

  it('names every invalid entry', () => {
    expect(() =>
      parseBundle(
        file({
          logbook_types: ['ok', ' '],
          scopes: 'North',
          map_styles: [{ name: 'Base', url: 'https://x', is_default: 'yes' }],
          map_settings: {},
        }),
      ),
    ).toThrow(
      'Invalid file: logbook_types[1] is invalid; scopes is not a list; map_styles[0] is invalid; map_settings is invalid',
    );
  });
});

it('bundleFileName uses the date', () => {
  expect(bundleFileName(new Date('2026-11-14T12:00:00Z'))).toBe('universam-config-2026-11-14.json');
});
