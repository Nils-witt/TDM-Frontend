import { type ReactNode, useMemo, useState } from 'react';
import type { Mission } from '@/api/missions';
import PrintDialog from './PrintDialog';
import { MissionPrintContext } from './missionPrintContext';

// The dialog lives here, not in the menu item that opened it, so closing the
// menu does not close it.
function MissionPrintProvider({ children }: { children: ReactNode }) {
  const [printing, setPrinting] = useState<Mission | null>(null);
  const value = useMemo(() => ({ print: (mission: Mission) => setPrinting(mission) }), []);

  return (
    <MissionPrintContext value={value}>
      {children}
      {printing && (
        <PrintDialog
          missionId={printing.id}
          event={printing.occurred_event}
          onClose={() => setPrinting(null)}
        />
      )}
    </MissionPrintContext>
  );
}

export default MissionPrintProvider;
