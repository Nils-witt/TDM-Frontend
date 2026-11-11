import { useMemo, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { fetchUsers, type User, usersPath } from '@/api/directory';
import { type Report, reportPdfPath, useReports } from '@/api/reports';
import { useErrorState, useResource } from '@/api/resource';
import { useSession } from '@/app/session';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useMissions } from '@/data/missionsContext';
import { canShare, canSign, isFinished, missionName, type Users } from './reportHelpers';

export type SignedFilter = 'all' | 'signed' | 'unsigned';

// The Reports widget's state, shared by the dashboard and the responsive UI.
// selectedId is the mission Create offers first; initialMission the mission
// filter it starts with.
export function useReportsWidget(selectedId: string | null, initialMission = '') {
  const { principal } = useSession();
  const offline = useOffline();
  // Reports are of done and closed missions.
  const missions = useMissions({ closed: true });
  const { data: userList } = useResource<User[]>(usersPath, fetchUsers);
  const users = useMemo<Users>(() => {
    const list = userList ?? [];
    return {
      byId: new Map(list.map((u) => [u.id, u])),
      byUsername: new Map(list.flatMap((u) => (u.username ? [[u.username, u] as const] : []))),
    };
  }, [userList]);
  const { openWidget } = useWidgetWindows();
  const [missionFilter, setMissionFilter] = useState(initialMission);
  const [signedFilter, setSignedFilter] = useState<SignedFilter>('all');
  const reports = useReports({
    missionId: missionFilter || undefined,
    signed: signedFilter === 'all' ? undefined : signedFilter === 'signed',
  });
  const [error, setError] = useErrorState(reports.error);
  const [creating, setCreating] = useState(false);
  const [signing, setSigning] = useState<Report | null>(null);
  const [sharing, setSharing] = useState<Report | null>(null);

  const finished = missions.items
    .filter(isFinished)
    .toSorted((a, b) => a.occurred_event.localeCompare(b.occurred_event));

  const openPdf = (r: Report, signed = false) =>
    openWidget('PdfViewer', {
      path: reportPdfPath(r.id, signed),
      name: `${missionName(missions.byId, r.mission)}${signed ? ' (signed)' : ''}.pdf`,
    });

  const done = () => {
    setCreating(false);
    setSigning(null);
    setSharing(null);
    setError(null);
    void reports.reload();
  };

  return {
    offline,
    missions,
    userList: userList ?? [],
    users,
    missionFilter,
    setMissionFilter,
    signedFilter,
    setSignedFilter,
    reports,
    error,
    setError,
    finished,
    createMissionId: selectedId,
    creating,
    setCreating,
    signing,
    setSigning,
    sharing,
    setSharing,
    canSign: (r: Report) => !offline && canSign(r, principal),
    canShare: (r: Report) => !offline && canShare(r, principal),
    openPdf,
    // After a create, also opens the new report's PDF.
    created: (r: Report) => {
      done();
      openPdf(r);
    },
    done,
  };
}
