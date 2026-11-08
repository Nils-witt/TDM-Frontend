import type { ReactNode } from 'react';
import { useCollection } from '@/api/collection';
import { fetchMissions, missionsPath } from '@/api/missions';
import { MissionsContext } from './missionsContext';

function MissionsProvider({ children }: { children: ReactNode }) {
  const missions = useCollection(missionsPath, fetchMissions);
  return <MissionsContext value={missions}>{children}</MissionsContext>;
}

export default MissionsProvider;
