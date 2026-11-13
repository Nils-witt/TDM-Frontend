import { createContext, use } from 'react';
import type { MissionScope } from '@/api/catalogs';

export const defaultScopeName = 'Default';
export const globalScopeName = 'Global';

// The mission scope this tab works in; new missions are created in it. null
// is the implicit Default scope. Global shows every scope's missions and
// units; it is not a scope of its own, so new missions then go to Default.
export type SelectedScope = {
  // null for Default, and while global.
  scopeId: string | null;
  // null for Default, and while global.
  scope: MissionScope | null;
  global: boolean;
  // Whether a mission or unit in this scope (null = Default) is shown.
  matches: (scope: string | null | undefined) => boolean;
  setScope: (id: string | null) => void;
  setGlobal: () => void;
};

export const SelectedScopeContext = createContext<SelectedScope | null>(null);

export function useSelectedScope(): SelectedScope {
  const v = use(SelectedScopeContext);
  if (!v) throw new Error('useSelectedScope outside of SelectedScopeProvider');
  return v;
}

// The name the tab's scope is shown by in the pickers.
export function selectedScopeName({ global, scope }: SelectedScope): string {
  if (global) return globalScopeName;
  return scope?.name ?? defaultScopeName;
}

// The pickers' tooltip.
export function selectedScopeTitle(sel: SelectedScope): string {
  return sel.global
    ? `Showing every scope; new missions are created in ${defaultScopeName}`
    : `New missions are created in ${selectedScopeName(sel)}`;
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
