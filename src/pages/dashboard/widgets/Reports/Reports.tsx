import { useMemo, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { fetchUsers, memberName, type User, usersPath } from '@/api/directory';
import type { Mission } from '@/api/missions';
import { type Report, reportPdfPath, type Signature, useReports } from '@/api/reports';
import { useErrorState, useResource } from '@/api/resource';
import { useSession } from '@/app/session';
import { FormError, SectionText, compactControls, sectionStack } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useMissions } from '@/data/missionsContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import { formatTime } from '../shared/logbookEntries';
import { EmptyState } from '../shared/WidgetStates';
import table from '../shared/CatalogManager.module.scss';
import CreateReportDialog from './CreateReportDialog';
import ShareReportDialog from './ShareReportDialog';
import SignReportDialog from './SignReportDialog';
import { canShare, canSign, isFinished } from './reportHelpers';
import styles from './Reports.module.scss';

type SignedFilter = 'all' | 'signed' | 'unsigned';

type Users = {
  byId: ReadonlyMap<string, User>;
  byUsername: ReadonlyMap<string, User>;
};

// A deleted mission is no longer listed: shown by its ID.
const missionName = (missions: ReadonlyMap<string, Mission>, id: string) =>
  missions.get(id)?.occurred_event ?? id;

// Reports record users by username (created_by) and signers by user ID.
const userByName = (users: Users, username: string) => {
  const u = users.byUsername.get(username);
  return u ? memberName(u) : username;
};
const userById = (users: Users, id: string) => {
  const u = users.byId.get(id);
  return u ? memberName(u) : id;
};

// The reports the caller may see: admins all, anyone else the ones they
// created, sign, or that are shared with them or their groups. The report's
// creator or an admin uploads the signed PDF, once, and shares it. PDFs open
// in a window, as they need the token.
function ReportsWidget() {
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
  const { selectedId } = useDashboard();
  const { openWidget } = useWidgetWindows();
  const [missionFilter, setMissionFilter] = useState('');
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

  return (
    <div className={sectionStack}>
      <SectionText>
        Stored mission reports: the PDF and the data it was made from. Whoever created a report, or
        an admin, uploads its signed PDF once and may share it with users or groups.
      </SectionText>
      <div className={`${styles.filters} ${compactControls}`}>
        <select
          aria-label="Mission"
          value={missionFilter}
          onChange={(e) => setMissionFilter(e.target.value)}
        >
          <option value="">All missions</option>
          {missionFilter !== '' && !finished.some((m) => m.id === missionFilter) && (
            <option value={missionFilter}>{missionName(missions.byId, missionFilter)}</option>
          )}
          {finished.map((m) => (
            <option key={m.id} value={m.id}>
              {m.occurred_event}
            </option>
          ))}
        </select>
        <select
          aria-label="Signed"
          value={signedFilter}
          onChange={(e) => setSignedFilter(e.target.value as SignedFilter)}
        >
          <option value="all">Signed and unsigned</option>
          <option value="signed">Signed</option>
          <option value="unsigned">Unsigned</option>
        </select>
        <button
          type="button"
          className="btn primary"
          disabled={offline}
          onClick={() => setCreating(true)}
        >
          Create report
        </button>
      </div>
      {reports.loading ? (
        <Spinner compact />
      ) : reports.items.length === 0 ? (
        <EmptyState className="">No reports.</EmptyState>
      ) : (
        <ReportTable
          reports={reports.items}
          missions={missions.byId}
          users={users}
          canSign={(r) => !offline && canSign(r, principal)}
          canShare={(r) => !offline && canShare(r, principal)}
          onSign={setSigning}
          onShare={setSharing}
          onOpen={openPdf}
        />
      )}
      <FormError error={error} onClose={() => setError(null)} />
      {creating && (
        <CreateReportDialog
          missions={missions.items}
          missionId={selectedId}
          onCreated={(r) => {
            done();
            openPdf(r);
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {signing && (
        <SignReportDialog
          report={signing}
          event={missionName(missions.byId, signing.mission)}
          users={userList ?? []}
          onSigned={done}
          onClose={() => setSigning(null)}
        />
      )}
      {sharing && (
        <ShareReportDialog
          report={sharing}
          event={missionName(missions.byId, sharing.mission)}
          users={userList ?? []}
          onShared={done}
          onClose={() => setSharing(null)}
        />
      )}
    </div>
  );
}

function ReportTable({
  reports,
  missions,
  users,
  canSign,
  canShare,
  onSign,
  onShare,
  onOpen,
}: {
  reports: readonly Report[];
  missions: ReadonlyMap<string, Mission>;
  users: Users;
  canSign: (r: Report) => boolean;
  canShare: (r: Report) => boolean;
  onSign: (r: Report) => void;
  onShare: (r: Report) => void;
  onOpen: (r: Report, signed?: boolean) => void;
}) {
  return (
    <div className={table.tableWrap}>
      <table className={table.table}>
        <thead>
          <tr>
            <th>Mission</th>
            <th>Created</th>
            <th>Signatures</th>
            <th>
              <span className={table.hidden}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>{missionName(missions, r.mission)}</td>
              <td className={table.meta}>
                {formatTime(r.created_at)}
                <br />
                {userByName(users, r.created_by)}
                <Shares report={r} users={users} />
              </td>
              <td>
                {r.signed === null ? (
                  <span className="muted">Unsigned</span>
                ) : (
                  <Signatures signatures={r.signed.signatures} users={users} />
                )}
              </td>
              <td className={table.actions}>
                <span className="row">
                  <button type="button" className="btn" onClick={() => onOpen(r)}>
                    PDF
                  </button>
                  {r.signed !== null ? (
                    <button type="button" className="btn" onClick={() => onOpen(r, true)}>
                      Signed PDF
                    </button>
                  ) : (
                    canSign(r) && (
                      <button type="button" className="btn" onClick={() => onSign(r)}>
                        Upload signed
                      </button>
                    )
                  )}
                  {canShare(r) && (
                    <button type="button" className="btn" onClick={() => onShare(r)}>
                      Share…
                    </button>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Shares({ report, users }: { report: Report; users: Users }) {
  const names = [
    ...report.shared_users.map((id) => userById(users, id)),
    ...report.shared_groups.map((g) => `${g} (group)`),
  ];
  if (names.length === 0) return null;
  return <div className={styles.shared}>Shared with {names.join(', ')}</div>;
}

function Signatures({ signatures, users }: { signatures: Signature[]; users: Users }) {
  return (
    <ul className={styles.signatures}>
      {signatures.map((s, i) => (
        <li key={i}>
          {s.user_id !== null ? userById(users, s.user_id) : s.name}
          {s.user_id === null && <span className={styles.external}> (external)</span>}
          {' · '}
          {formatTime(s.signed_at)}
        </li>
      ))}
    </ul>
  );
}

export default ReportsWidget;
