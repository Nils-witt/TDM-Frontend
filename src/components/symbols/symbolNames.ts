let names: Promise<string[]> | null = null;

// Loaded on first use from the list the material-symbols package ships as a
// type, so it stays out of the main bundle.
export function symbolNames(): Promise<string[]> {
  names ??= import('material-symbols/index.d.ts?raw').then(({ default: src }) => [
    ...new Set(Array.from(src.matchAll(/"([a-z0-9_]+)"/g), (m) => m[1]!)),
  ]);
  return names;
}
