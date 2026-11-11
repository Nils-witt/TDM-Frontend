import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Fragment } from 'react';
import { useSearchParams } from 'react-router';
import type { Mission } from '@/api/missions';
import type { Report } from '@/api/reports';
import { type SignedFilter, useReportsWidget } from '@/pages/dashboard/widgets/Reports/Reports.ts';
import {
  missionName,
  shareNames,
  userById,
  userByName,
  type Users,
} from '@/pages/dashboard/widgets/Reports/reportHelpers';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import { FieldRowMUI, FormErrorMUI, MutedMUI } from '../shared/FormMUI';
import CreateReportDialogMUI from './CreateReportDialogMUI';
import ShareReportDialogMUI from './ShareReportDialogMUI';
import SignReportDialogMUI from './SignReportDialogMUI';

// The Reports widget in MUI, with useReportsWidget's behavior. ?mission=
// (a mission page's Reports link) filters by that mission and is the one
// Create offers first. PDFs open in a sheet, as they need the token.
function ReportsMUI() {
  const [params] = useSearchParams();
  const fromUrl = params.get('mission') ?? '';
  const r = useReportsWidget(fromUrl || null, fromUrl);

  return (
    <Stack sx={{ gap: 2 }}>
      <MutedMUI>
        Stored mission reports: the PDF and the data it was made from. Whoever created a report, or
        an admin, uploads its signed PDF once and may share it with users or groups.
      </MutedMUI>
      <FieldRowMUI>
        <TextField
          select
          size="small"
          label="Mission"
          value={r.missionFilter}
          onChange={(e) => r.setMissionFilter(e.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="">All missions</MenuItem>
          {r.missionFilter !== '' && !r.finished.some((m) => m.id === r.missionFilter) && (
            <MenuItem value={r.missionFilter}>
              {missionName(r.missions.byId, r.missionFilter)}
            </MenuItem>
          )}
          {r.finished.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.occurred_event}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Signed"
          value={r.signedFilter}
          onChange={(e) => r.setSignedFilter(e.target.value as SignedFilter)}
        >
          <MenuItem value="all">Signed and unsigned</MenuItem>
          <MenuItem value="signed">Signed</MenuItem>
          <MenuItem value="unsigned">Unsigned</MenuItem>
        </TextField>
      </FieldRowMUI>
      <Box>
        <Button variant="contained" disabled={r.offline} onClick={() => r.setCreating(true)}>
          Create report
        </Button>
      </Box>
      {r.reports.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : r.reports.items.length === 0 ? (
        <MutedMUI>No reports.</MutedMUI>
      ) : (
        <Stack component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {r.reports.items.map((report, i) => (
            <Fragment key={report.id}>
              {i > 0 && <Divider component="li" aria-hidden />}
              <ReportItemMUI
                report={report}
                missions={r.missions.byId}
                users={r.users}
                canSign={r.canSign(report)}
                canShare={r.canShare(report)}
                onSign={() => r.setSigning(report)}
                onShare={() => r.setSharing(report)}
                onOpen={(signed) => r.openPdf(report, signed)}
              />
            </Fragment>
          ))}
        </Stack>
      )}
      <FormErrorMUI error={r.error} onClose={() => r.setError(null)} />
      {r.creating && (
        <CreateReportDialogMUI
          missions={r.missions.items}
          missionId={r.createMissionId}
          onCreated={r.created}
          onClose={() => r.setCreating(false)}
        />
      )}
      {r.signing && (
        <SignReportDialogMUI
          report={r.signing}
          event={missionName(r.missions.byId, r.signing.mission)}
          users={r.userList}
          onSigned={r.done}
          onClose={() => r.setSigning(null)}
        />
      )}
      {r.sharing && (
        <ShareReportDialogMUI
          report={r.sharing}
          event={missionName(r.missions.byId, r.sharing.mission)}
          users={r.userList}
          onShared={r.done}
          onClose={() => r.setSharing(null)}
        />
      )}
    </Stack>
  );
}

function ReportItemMUI({
  report: r,
  missions,
  users,
  canSign,
  canShare,
  onSign,
  onShare,
  onOpen,
}: {
  report: Report;
  missions: ReadonlyMap<string, Mission>;
  users: Users;
  canSign: boolean;
  canShare: boolean;
  onSign: () => void;
  onShare: () => void;
  onOpen: (signed: boolean) => void;
}) {
  const shared = shareNames(r, users);
  return (
    <Stack component="li" sx={{ py: 1.5, gap: 0.75 }}>
      <Typography sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
        {missionName(missions, r.mission)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatTime(r.created_at)} · {userByName(users, r.created_by)}
      </Typography>
      {shared.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          Shared with {shared.join(', ')}
        </Typography>
      )}
      {r.signed === null ? (
        <Typography variant="body2" color="text.secondary">
          Unsigned
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {r.signed.signatures.map((s, i) => (
            <Typography component="li" variant="body2" key={i}>
              {s.user_id !== null ? userById(users, s.user_id) : `${s.name} (external)`}
              {' · '}
              {formatTime(s.signed_at)}
            </Typography>
          ))}
        </Box>
      )}
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" variant="outlined" onClick={() => onOpen(false)}>
          PDF
        </Button>
        {r.signed !== null ? (
          <Button size="small" variant="outlined" onClick={() => onOpen(true)}>
            Signed PDF
          </Button>
        ) : (
          canSign && (
            <Button size="small" variant="outlined" onClick={onSign}>
              Upload signed
            </Button>
          )
        )}
        {canShare && (
          <Button size="small" variant="outlined" onClick={onShare}>
            Share…
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

export default ReportsMUI;
