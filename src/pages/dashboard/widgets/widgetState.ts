import { createContext, use, useCallback, useEffect, useState } from 'react';

// Identifies one widget of a layout: the layout, its monitor, the item's
// position and the widget's ID, so two maps on one dashboard keep their own
// state and a different widget moved into a position does not read it. null
// (windows, the responsive UI) keeps the state in memory only.
export const WidgetInstanceContext = createContext<string | null>(null);

export const widgetInstanceKey = (
  layoutId: string,
  monitorId: string,
  index: number,
  widgetId: string,
) => `${layoutId}.${monitorId}.${index}.${widgetId}`;

// Session storage is per tab and survives reloads, but a tab opened from this
// one starts with a copy of it; the window's name (set by LayoutProvider)
// tells them apart, as for the monitor choice.
const storageKey = (instance: string, name: string) =>
  `universam.widgetState.${window.name}.${instance}.${name}`;

function load<T>(key: string | null, parse: (v: unknown) => T | undefined): T | undefined {
  if (!key) return undefined;
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? undefined : parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function store(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // kept in memory until the tab is reloaded
  }
}

type Stored<T> = { key: string | null; value: T; changed: boolean };

// Like useState, but a dashboard widget's value is kept in the tab's session
// storage under name. parse validates what was stored (undefined = invalid,
// initial is used), as an older version may have stored something else.
export function useWidgetState<T>(
  name: string,
  initial: T,
  parse: (v: unknown) => T | undefined,
): [T, (update: T | ((prev: T) => T)) => void] {
  const instance = use(WidgetInstanceContext);
  const key = instance === null ? null : storageKey(instance, name);
  const [state, setState] = useState<Stored<T>>(() => ({
    key,
    value: load(key, parse) ?? initial,
    changed: false,
  }));

  // Another layout or position: read its state instead.
  let current = state;
  if (state.key !== key) {
    current = { key, value: load(key, parse) ?? initial, changed: false };
    setState(current);
  }

  useEffect(() => {
    if (state.key && state.changed) store(state.key, state.value);
  }, [state]);

  const set = useCallback(
    (update: T | ((prev: T) => T)) =>
      setState((prev) => ({
        key: prev.key,
        value: typeof update === 'function' ? (update as (prev: T) => T)(prev.value) : update,
        changed: true,
      })),
    [],
  );

  return [current.value, set];
}
