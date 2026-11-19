import { describe, expect, it } from 'vitest';
import { buildLabel } from './version';

describe('buildLabel', () => {
  it('prefers the release', () => {
    expect(buildLabel('v1.2.3', 'abcdef0123')).toBe('v1.2.3');
  });
  it('shows the short commit of a dev build', () => {
    expect(buildLabel('dev', 'abcdef0123')).toBe('abcdef0');
    expect(buildLabel('0.0.0', 'abcdef0123')).toBe('abcdef0');
  });
  it('falls back to the version or unknown', () => {
    expect(buildLabel('dev', '')).toBe('dev');
    expect(buildLabel('', '')).toBe('unknown');
  });
});
