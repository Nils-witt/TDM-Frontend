import { createContext, use } from 'react';
import type { Mission } from '@/api/missions';

type MissionPrintContextValue = {
  // Asks for the export template, then opens the PDF in a window.
  print: (mission: Mission) => void;
};

export const MissionPrintContext = createContext<MissionPrintContextValue | null>(null);

export function useMissionPrint(): MissionPrintContextValue {
  const v = use(MissionPrintContext);
  if (!v) throw new Error('useMissionPrint outside of MissionPrintProvider');
  return v;
}
