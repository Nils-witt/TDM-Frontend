import { createContext, use } from 'react';

// Shared by the widgets on the grid and in floating widget windows.
export type DashboardState = {
  selectedId: string | null;
};

export const initialDashboardState: DashboardState = {
  selectedId: null,
};

type DashboardContextValue = DashboardState & {
  // Merges patch into the state.
  update: (patch: Partial<DashboardState>) => void;
};

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const v = use(DashboardContext);
  if (!v) throw new Error('useDashboard outside of DashboardProvider');
  return v;
}
