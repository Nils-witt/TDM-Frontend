import { requestBlob } from '@/api/client';
import { fileContentPath, type LogFile } from '@/api/logbook';

// The content needs the token, so a download goes through a blob.
export async function downloadFile(f: Pick<LogFile, 'id' | 'name' | 'media_type'>) {
  const blob = await requestBlob(fileContentPath(f.id));
  const url = URL.createObjectURL(new Blob([blob], { type: f.media_type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = f.name;
  a.click();
  // Once the click has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
