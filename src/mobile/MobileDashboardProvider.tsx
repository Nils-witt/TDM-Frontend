import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router';
import { DashboardContext, type DashboardState } from '@/pages/dashboard/dashboardContext';
import { mobilePaths } from './mobilePaths';

const storageKey = 'universam.mobile.selectedId';

function stored(): string | null {
  try {
    return sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function store(id: string | null) {
  try {
    if (id === null) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, id);
  } catch {
    // Only a reload forgets it then.
  }
}

// The selection is in the URL while a mission is open on the Missions tab, and
// kept for the other tabs (and reloads of this tab) otherwise. Selecting on
// the Missions tab opens the mission; elsewhere (the map) it stays put.
function MobileDashboardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const match = useMatch(`${mobilePaths.missions}/:missionId`);
  const routeId = match?.params.missionId;
  const [kept, setKept] = useState<string | null>(stored);

  const creating = routeId === 'new';
  const selectedId = creating ? null : (routeId ?? kept);
  if (routeId !== undefined && !creating && routeId !== kept) {
    setKept(routeId);
    store(routeId);
  }

  const onMissionsTab = pathname.startsWith(mobilePaths.missions);
  const update = useCallback(
    (patch: Partial<DashboardState>) => {
      if (!('selectedId' in patch)) return;
      const id = patch.selectedId ?? null;
      setKept(id);
      store(id);
      // A mission just created replaces its empty form in the history.
      if (onMissionsTab) {
        void navigate(id === null ? mobilePaths.missions : mobilePaths.mission(id), {
          replace: creating,
        });
      }
    },
    [navigate, onMissionsTab, creating],
  );

  const value = useMemo(() => ({ selectedId, update }), [selectedId, update]);
  return <DashboardContext value={value}>{children}</DashboardContext>;
}

export default MobileDashboardProvider;
