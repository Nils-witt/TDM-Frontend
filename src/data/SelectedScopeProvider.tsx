import { type ReactNode, useCallback, useMemo } from 'react';
import { useSession } from '@/app/session';
import { useCatalogs } from './catalogContext';
import { SelectedScopeContext } from './selectedScope';

// The mission scope of the session (chosen with the user function at sign-in,
// switched from the menu bar). The API only answers data of that scope, so
// matches only guards rows the replica kept from before.
function SelectedScopeProvider({ children }: { children: ReactNode }) {
  const { scopes } = useCatalogs();
  const { session } = useSession();
  const scopeId = session.scope.id === '' ? null : session.scope.id;
  const scope = scopeId === null ? null : (scopes.byId.get(scopeId) ?? null);

  const matches = useCallback((s: string | null | undefined) => (s ?? null) === scopeId, [scopeId]);

  const value = useMemo(
    () => ({ scopeId, scope, global: false, matches }),
    [scopeId, scope, matches],
  );
  return <SelectedScopeContext value={value}>{children}</SelectedScopeContext>;
}

export default SelectedScopeProvider;
