import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type MouseEvent, useState } from 'react';
import { isPinned, type LogFile } from '@/api/logbook';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { previewKind } from '@/pages/dashboard/widgets/shared/attachmentPreview';
import { downloadFile } from '@/pages/dashboard/widgets/shared/fileDownload';
import { pinLabel, useFilePin } from '@/pages/dashboard/widgets/shared/filePin';
import { formatSize } from '@/pages/dashboard/widgets/shared/logbookEntries';
import { FileTypeBadgeMUI } from './TypeBadgeMUI';

// As LogFileList: an image, PDF or text file opens the attachment viewer; with
// a modifier key held, or for any other file, it downloads. With canPin a
// visible button toggles the pin, as touch screens have no hover.
function LogFileListMUI({
  files,
  canPin = false,
  onError,
}: {
  files: readonly LogFile[];
  canPin?: boolean;
  onError: (error: string) => void;
}) {
  const { openWidget } = useWidgetWindows();
  const { pinning, toggle } = useFilePin(onError);
  const [downloading, setDownloading] = useState<string | null>(null);

  const open = (e: MouseEvent, f: LogFile) => {
    const plain = !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
    if (plain && previewKind(f) !== null) {
      openWidget('AttachmentViewer', { fileId: f.id, name: f.name, mediaType: f.media_type });
      return;
    }
    setDownloading(f.id);
    downloadFile(f)
      .catch((err: unknown) => onError((err as Error).message))
      .finally(() => setDownloading(null));
  };

  return (
    <Stack component="ul" sx={{ listStyle: 'none', m: 0, p: 0, gap: 0.5 }}>
      {files.map((f) => (
        <li key={f.id}>
          <Stack direction="row" useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <SymbolIcon name="attach_file" />
            <Link
              component="button"
              type="button"
              variant="body2"
              disabled={downloading === f.id}
              onClick={(e: MouseEvent) => open(e, f)}
              sx={{ textAlign: 'left', wordBreak: 'break-word' }}
            >
              {f.name}
            </Link>
            <FileTypeBadgeMUI typeId={f.type} />
            <Typography component="span" variant="body2" color="text.secondary">
              {formatSize(f.size)}
            </Typography>
            {(canPin || isPinned(f)) && (
              <IconButton
                size="small"
                color={isPinned(f) ? 'primary' : 'default'}
                title={pinLabel(f)}
                aria-label={pinLabel(f)}
                aria-pressed={isPinned(f)}
                disabled={!canPin || pinning === f.id}
                onClick={() => toggle(f)}
                sx={{
                  my: -0.5,
                  '&.Mui-disabled': { color: isPinned(f) ? 'primary.main' : undefined },
                  '& .material-symbols-outlined': {
                    fontVariationSettings: isPinned(f) ? "'FILL' 1" : undefined,
                  },
                }}
              >
                <SymbolIcon name="push_pin" />
              </IconButton>
            )}
          </Stack>
          {f.content_text !== '' && (
            <Accordion disableGutters variant="outlined" sx={{ mt: 0.5 }}>
              <AccordionSummary expandIcon={<SymbolIcon name="expand_more" />}>
                <Typography variant="body2" color="text.secondary">
                  Content text
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {f.content_text}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}
        </li>
      ))}
    </Stack>
  );
}

export default LogFileListMUI;
