import type { ReactNode } from 'react';
import type { Mission } from '@/api/missions';
import { scopeKey, useTable } from '@/api/replica';
import { MissionsContext } from './missionsContext';

const missionsKey = scopeKey('missions');

function MissionsProvider({ children }: { children: ReactNode }) {
  const missions = useTable<Mission>(missionsKey);
  return <MissionsContext value={missions}>{children}</MissionsContext>;
}

export default MissionsProvider;
