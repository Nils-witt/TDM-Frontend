import { describe, expect, it } from 'vitest';
import { matchesShortcut, usesCommandKey } from './shortcut';

const key = (code: string, mods: Partial<KeyboardEvent> = {}) =>
  ({
    code,
    altKey: false,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...mods,
  }) as KeyboardEvent;

describe('matchesShortcut', () => {
  it('compares the physical key and every modifier', () => {
    expect(matchesShortcut(key('KeyC', { altKey: true, shiftKey: true }), 'Alt+Shift+C')).toBe(
      true,
    );
    expect(matchesShortcut(key('KeyC', { altKey: true }), 'Alt+Shift+C')).toBe(false);
    expect(
      matchesShortcut(key('KeyC', { altKey: true, shiftKey: true, ctrlKey: true }), 'Alt+Shift+C'),
    ).toBe(false);
  });

  it('maps digits to Digit codes', () => {
    expect(matchesShortcut(key('Digit1', { ctrlKey: true }), 'Ctrl+1')).toBe(true);
    expect(matchesShortcut(key('Key1', { ctrlKey: true }), 'Ctrl+1')).toBe(false);
  });

  it('is case insensitive for the key', () => {
    expect(matchesShortcut(key('KeyS', { metaKey: true }), 'Meta+s')).toBe(true);
  });
});

describe('usesCommandKey', () => {
  it('is true for Ctrl, Meta and Mod', () => {
    expect(usesCommandKey('Ctrl+S')).toBe(true);
    expect(usesCommandKey('Meta+S')).toBe(true);
    expect(usesCommandKey('Mod+S')).toBe(true);
    expect(usesCommandKey('Alt+Shift+C')).toBe(false);
  });
});
