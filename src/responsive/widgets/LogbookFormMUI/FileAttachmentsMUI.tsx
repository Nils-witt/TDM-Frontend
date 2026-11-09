import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRef } from 'react';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import type { Attachments } from '@/pages/dashboard/widgets/LogbookForm/LogbookForm.ts';
import { formatSize } from '@/pages/dashboard/widgets/shared/logbookEntries';

// As FileAttachments: the text of images and PDFs is read by OCR, which can be
// skipped.
function FileAttachmentsMUI({ files, disabled }: { files: Attachments; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const { attachments, fileTypes, add, update, remove, skipOcr } = files;

  return (
    <Stack sx={{ gap: 1.5 }}>
      {attachments.map((a) => (
        <Paper
          key={a.key}
          variant="outlined"
          sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}
        >
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <TextField
              label="File name"
              size="small"
              required
              value={a.name}
              disabled={disabled}
              onChange={(e) => update(a.key, { name: e.target.value })}
              sx={{ flex: '1 1 10rem' }}
            />
            <TextField
              select
              label="File type"
              size="small"
              value={a.typeId}
              disabled={disabled || fileTypes.length === 0}
              onChange={(e) => update(a.key, { typeId: e.target.value })}
              slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
              sx={{ flex: '1 1 8rem' }}
            >
              {fileTypes.length === 0 && <MenuItem value="">No file types</MenuItem>}
              {fileTypes.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" color="text.secondary">
              {formatSize(a.file.size)}
            </Typography>
            <IconButton
              aria-label={`Remove ${a.name}`}
              title="Remove file"
              onClick={() => remove(a.key)}
              disabled={disabled}
            >
              <SymbolIcon name="close" />
            </IconButton>
          </Stack>
          <TextField
            label="Content text"
            size="small"
            multiline
            minRows={1}
            value={a.contentText}
            disabled={disabled}
            onChange={(e) => update(a.key, { contentText: e.target.value })}
            placeholder={
              a.ocr?.state === 'running' ? 'Reading text…' : 'E.g. a transcript (optional)'
            }
          />
          {a.ocr?.state === 'running' && (
            <Stack direction="row" role="status" sx={{ alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Reading text… {a.ocr.progress}
              </Typography>
              <Button size="small" onClick={() => skipOcr(a.key)} disabled={disabled}>
                Skip
              </Button>
            </Stack>
          )}
          {a.ocr?.state === 'error' && <Alert severity="warning">{a.ocr.message}</Alert>}
        </Paper>
      ))}
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          // Picking the same file again adds it again.
          e.target.value = '';
        }}
      />
      <Button
        variant="outlined"
        startIcon={<SymbolIcon name="attach_file" />}
        onClick={() => input.current?.click()}
        disabled={disabled}
        sx={{ alignSelf: 'flex-start' }}
      >
        Attach files
      </Button>
    </Stack>
  );
}

export default FileAttachmentsMUI;
