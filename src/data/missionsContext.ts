import { createContext, use } from 'react';
import type { Collection } from '@/api/collection';
import type { Mission } from '@/api/missions';

export const MissionsContext = createContext<Collection<Mission> | null>(null);

// The active (not deleted) missions, newest first.
export function useMissions(): Collection<Mission> {
  const v = use(MissionsContext);
  if (!v) throw new Error('useMissions outside of MissionsProvider');
  return v;
}
