import { createContext, use } from 'react';
import type { MissionScope } from '@/api/catalogs';

export const globalScopeName = 'Global';

// The mission scope this tab works in; new missions are created in it. null
// is the implicit Global scope.
export type SelectedScope = {
  scopeId: string | null;
  // null for Global.
  scope: MissionScope | null;
  setScope: (id: string | null) => void;
};

export const SelectedScopeContext = createContext<SelectedScope | null>(null);

export function useSelectedScope(): SelectedScope {
  const v = use(SelectedScopeContext);
  if (!v) throw new Error('useSelectedScope outside of SelectedScopeProvider');
  return v;
}

// The name a mission's scope ID is shown by: Global for none, the ID of a
// deleted one.
export function scopeName(
  id: string | null | undefined,
  scopes: ReadonlyMap<string, MissionScope>,
): string {
  if (!id) return globalScopeName;
  return scopes.get(id)?.name ?? id;
}

// By name; Global is offered before them.
export function scopeOptions(scopes: readonly MissionScope[]): MissionScope[] {
  return [...scopes].sort((a, b) => a.name.localeCompare(b.name));
}
