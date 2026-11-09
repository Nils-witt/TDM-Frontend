import { type ReactNode, useMemo, useState } from 'react';
import { type Mission, patchMission } from '@/api/missions';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SectionText } from '@/components/form';
import { useMissions } from '@/data/missionsContext';
import { MissionCloseContext } from './missionCloseContext';

// The dialog lives here, not in the menu item that opened it, so closing a menu
// does not close it. universalGoApi has no reopen: closing is final.
function MissionCloseProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Mission | null>(null);
  const missions = useMissions();
  const value = useMemo(() => ({ confirm: (m: Mission) => setPending(m) }), []);

  const run = async (m: Mission) => {
    await patchMission(m.id, { status: 'closed' });
    await missions.reload();
    setPending(null);
  };

  return (
    <MissionCloseContext value={value}>
      {children}
      {pending && (
        <ConfirmDialog
          title="Close mission"
          message={
            <>
              <SectionText>
                Close <strong>{pending.occurred_event}</strong>?
              </SectionText>
              <SectionText>
                <span className="muted">
                  The mission, its logbook and its tasks can no longer be changed. This cannot be
                  undone.
                </span>
              </SectionText>
            </>
          }
          confirmLabel="Close mission"
          onConfirm={() => run(pending)}
          onCancel={() => setPending(null)}
        />
      )}
    </MissionCloseContext>
  );
}

export default MissionCloseProvider;
