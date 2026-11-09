import type { Layout, LayoutScope } from '@/api/layouts';

// The short label of a scope, for badges.
export const scopeLabel = (scope: LayoutScope) =>
  scope === 'global' ? 'Shared' : scope === 'group' ? 'Groups' : 'My layout';

// Who sees a layout, in words.
export function audience(l: Pick<Layout, 'scope' | 'groups' | 'owner'>): string {
  if (l.scope === 'global') return 'Everyone';
  if (l.scope === 'group') return l.groups.join(', ');
  return l.owner ?? '';
}
