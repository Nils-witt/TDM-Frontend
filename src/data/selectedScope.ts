import { createContext, use } from 'react';
import type { MissionScope } from '@/api/catalogs';

export const defaultScopeName = 'Default';

// The mission scope this tab works in; new missions are created in it. null
// is the implicit Default scope.
export type SelectedScope = {
  scopeId: string | null;
  // null for Default.
  scope: MissionScope | null;
  setScope: (id: string | null) => void;
};

export const SelectedScopeContext = createContext<SelectedScope | null>(null);

export function useSelectedScope(): SelectedScope {
  const v = use(SelectedScopeContext);
  if (!v) throw new Error('useSelectedScope outside of SelectedScopeProvider');
  return v;
}

// The name a mission's scope ID is shown by: Default for none, the ID of a
// deleted one.
export function scopeName(
  id: string | null | undefined,
  scopes: ReadonlyMap<string, MissionScope>,
): string {
  if (!id) return defaultScopeName;
  return scopes.get(id)?.name ?? id;
}

// By name; Default is offered before them.
export function scopeOptions(scopes: readonly MissionScope[]): MissionScope[] {
  return [...scopes].sort((a, b) => a.name.localeCompare(b.name));
}
