// A shortcut spec is written like "Alt+Shift+C": any of the modifiers Alt,
// Shift, Ctrl and Meta joined by "+", ending with a letter or digit. Mod is
// Meta (⌘) on macOS and Ctrl elsewhere.

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

const macSymbols: Record<string, string> = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Meta: '⌘' };
// macOS orders modifier symbols ⌃⌥⇧⌘.
const macOrder = ['Ctrl', 'Alt', 'Shift', 'Meta'];

const parse = (spec: string) => {
  const parts = spec.split('+');
  const key = parts.pop() ?? '';
  const mods = new Set(parts.map((m) => (m === 'Mod' ? (isMac ? 'Meta' : 'Ctrl') : m)));
  return { mods, key: key.toUpperCase() };
};

// "⌥⇧C" on macOS, "Alt+Shift+C" elsewhere.
export function formatShortcut(spec: string) {
  const { mods, key } = parse(spec);
  if (!isMac) return [...mods, key].join('+');
  return (
    macOrder
      .filter((m) => mods.has(m))
      .map((m) => macSymbols[m])
      .join('') + key
  );
}

// Compares the physical key (e.code), since on macOS Option changes e.key (⌥⇧C
// types "Ç").
export function matchesShortcut(e: KeyboardEvent, spec: string) {
  const { mods, key } = parse(spec);
  const code = /^[0-9]$/.test(key) ? `Digit${key}` : `Key${key}`;
  return (
    e.code === code &&
    e.altKey === mods.has('Alt') &&
    e.shiftKey === mods.has('Shift') &&
    e.ctrlKey === mods.has('Ctrl') &&
    e.metaKey === mods.has('Meta')
  );
}

// Such shortcuts also work while typing in a text field, as they type nothing.
export function usesCommandKey(spec: string) {
  const { mods } = parse(spec);
  return mods.has('Ctrl') || mods.has('Meta');
}
