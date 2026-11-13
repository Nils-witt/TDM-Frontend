import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useCatalogs } from './catalogContext';
import { SelectedScopeContext } from './selectedScope';

// Per tab, surviving reloads; a new tab starts in Default (a tab opened from
// this one starts with a copy of session storage, so it keeps the scope).
const storageKey = 'universam.missionScope';
// Stored for Global; no scope ID looks like it.
const globalValue = '*global';

function load(): string | null {
  try {
    return sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function store(id: string | null) {
  try {
    if (id === null) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, id);
  } catch {
    // kept in memory until the tab is reloaded
  }
}

function SelectedScopeProvider({ children }: { children: ReactNode }) {
  const { scopes } = useCatalogs();
  const [stored, setStored] = useState(load);

  const setScope = useCallback((id: string | null) => {
    store(id);
    setStored(id);
  }, []);
  const setGlobal = useCallback(() => setScope(globalValue), [setScope]);

  const global = stored === globalValue;
  // A deleted scope falls back to Default once the catalog is known; while it
  // loads the stored one is kept, so a reload does not lose it.
  const scope = stored === null || global ? null : (scopes.byId.get(stored) ?? null);
  const scopeId = stored !== null && !global && (scope !== null || scopes.loading) ? stored : null;

  const matches = useCallback(
    (s: string | null | undefined) => global || (s ?? null) === scopeId,
    [global, scopeId],
  );

  const value = useMemo(
    () => ({ scopeId, scope, global, matches, setScope, setGlobal }),
    [scopeId, scope, global, matches, setScope, setGlobal],
  );
  return <SelectedScopeContext value={value}>{children}</SelectedScopeContext>;
}

export default SelectedScopeProvider;
