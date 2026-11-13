import { erzeugeTaktischesZeichen, type TaktischesZeichen } from '@taktische-zeichen/core';
import type { UnitSymbol, UnitTacticalName } from '@/api/units';

// Rendering is costly and the units list is reloaded on every position
// report, so each symbol is rendered once.
const rendered = new Map<string, string | null>();

// The unit's tactical symbol as an SVG data URL, labeled like the units
// server's UI does (organisation, function, "regional-local-number"); null
// without a symbol or for one the library cannot render, e.g. an ID it no
// longer knows.
export function unitSymbolUrl(
  symbol: UnitSymbol | null | undefined,
  name: UnitTacticalName | null | undefined,
): string | null {
  if (!symbol || (!symbol.grundzeichen && !symbol.symbol)) return null;
  const spec: TaktischesZeichen = { ...(symbol as TaktischesZeichen) };
  if (name) {
    spec.organisationName = name.organisation;
    spec.typ = name.function;
    spec.name = [name.regional_association, name.local_association, name.number]
      .filter(Boolean)
      .join('-');
  }
  const key = JSON.stringify(spec);
  let url = rendered.get(key);
  if (url === undefined) {
    try {
      url = erzeugeTaktischesZeichen(spec).dataUrl;
    } catch {
      url = null;
    }
    rendered.set(key, url);
  }
  return url;
}
