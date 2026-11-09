import { createContext, use } from 'react';
import type { Mission } from '@/api/missions';

type MissionCloseContextValue = {
  // Asks the user first.
  confirm: (mission: Mission) => void;
};

export const MissionCloseContext = createContext<MissionCloseContextValue | null>(null);

export function useMissionClose(): MissionCloseContextValue {
  const v = use(MissionCloseContext);
  if (!v) throw new Error('useMissionClose outside of MissionCloseProvider');
  return v;
}
