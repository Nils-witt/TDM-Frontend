import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { memberName, type User } from '@/api/directory';
import type { Report } from '@/api/reports';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { type SignerRow, useSignReport } from '@/pages/dashboard/widgets/Reports/useSignReport';
import { DialogShell } from '../shared/DialogsMUI';
import { FormErrorMUI, FormSectionMUI } from '../shared/FormMUI';

// As SignReportDialog: a report is signed once.
function SignReportDialogMUI({
  report,
  event,
  users,
  onSigned,
  onClose,
}: {
  report: Report;
  event: string;
  users: readonly User[];
  onSigned: (r: Report) => void;
  onClose: () => void;
}) {
  const s = useSignReport({ report, users, onSigned });
  const close = () => {
    if (!s.busy) onClose();
  };
  return (
    <DialogShell
      title="Upload signed report"
      maxWidth="sm"
      onCancel={close}
      onSubmit={(e) => {
        e.preventDefault();
        void s.submit();
      }}
    >
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DialogContentText variant="body2">
          Upload the signed PDF of the report on <strong>{event}</strong> and who signed it. A
          report is signed once: this cannot be changed afterwards.
        </DialogContentText>
        <Stack direction="row" useFlexGap sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<SymbolIcon name="upload_file" />}
          >
            Signed PDF
            <input
              type="file"
              hidden
              accept="application/pdf,.pdf"
              onChange={(e) => s.setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {s.file?.name ?? 'No file chosen'}
          </Typography>
        </Stack>
        <FormSectionMUI legend="Signatures">
          {s.rows.map((r, i) => (
            <Stack
              key={r.key}
              direction="row"
              useFlexGap
              sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
            >
              <TextField
                select
                size="small"
                label="Kind"
                value={r.kind}
                onChange={(e) => s.update(r.key, { kind: e.target.value as SignerRow['kind'] })}
                sx={{ width: '8rem' }}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="external">External</MenuItem>
              </TextField>
              {r.kind === 'user' ? (
                <TextField
                  select
                  size="small"
                  label={`Signer ${i + 1}`}
                  value={r.userId}
                  onChange={(e) => s.update(r.key, { userId: e.target.value })}
                  slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                  sx={{ flex: '1 1 10rem' }}
                >
                  <MenuItem value="">Pick a user…</MenuItem>
                  {s.live.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {memberName(u)}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  size="small"
                  label={`Signer ${i + 1} name`}
                  value={r.name}
                  onChange={(e) => s.update(r.key, { name: e.target.value })}
                  slotProps={{ htmlInput: { maxLength: 255 } }}
                  sx={{ flex: '1 1 10rem' }}
                />
              )}
              <TextField
                size="small"
                type="datetime-local"
                label="Signed at"
                value={r.at}
                onChange={(e) => s.update(r.key, { at: e.target.value })}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: s.min, max: s.max },
                }}
                sx={{ flex: '1 1 12rem' }}
              />
              <IconButton
                aria-label={`Remove signer ${i + 1}`}
                disabled={s.rows.length === 1}
                onClick={() => s.remove(r.key)}
              >
                <SymbolIcon name="delete" />
              </IconButton>
            </Stack>
          ))}
          <div>
            <Button onClick={s.add} disabled={!s.canAdd}>
              Add signer
            </Button>
          </div>
        </FormSectionMUI>
        <TextField
          label="Note"
          size="small"
          multiline
          minRows={2}
          value={s.note}
          onChange={(e) => s.setNote(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 4000 } }}
        />
        <FormErrorMUI error={s.error} onClose={() => s.setError(null)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={s.busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={!s.canSubmit || s.busy}>
          {s.busy ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

export default SignReportDialogMUI;
