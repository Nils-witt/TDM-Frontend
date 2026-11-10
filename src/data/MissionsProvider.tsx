import type { ReactNode } from 'react';
import type { Mission } from '@/api/missions';
import { useTables } from '@/api/replica';
import { activeMissionKeys, MissionsContext } from './missionsContext';

function MissionsProvider({ children }: { children: ReactNode }) {
  const missions = useTables<Mission>(activeMissionKeys);
  return <MissionsContext value={missions}>{children}</MissionsContext>;
}

export default MissionsProvider;
