import { memo, useMemo, useState } from 'react';
import { isPinned, type LogEntry, type LogFile } from '@/api/logbook';
import { FormError } from '@/components/form';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { pinnedFirst } from '../shared/filePin';
import { formatTime } from '../shared/logbookEntries';
import LogFileList from '../shared/LogFileList';
import { EmptyState, NoMission } from '../shared/WidgetStates';

// Pinned files first, then newest first. Each file names the time of the entry
// it came with.
function FileListWidget() {
  const { mission, readOnly, logFiles, logEntries } = useSelectedMission();
  const [ownError, setError] = useState<string | null>(null);
  const error = ownError ?? logFiles.error;
  const files = useMemo(() => pinnedFirst(logFiles.items), [logFiles.items]);

  return (
    <>
      {mission === null && <NoMission className="mt" />}
      {mission !== null &&
        !logFiles.loading &&
        (logFiles.items.length === 0 ? (
          <EmptyState>No files yet.</EmptyState>
        ) : (
          <ul className="list">
            {files.map((f) => (
              <FileItem
                key={f.id}
                file={f}
                entry={logEntries.byId.get(f.entry)}
                canPin={!readOnly}
                onError={setError}
              />
            ))}
          </ul>
        ))}
      <FormError error={error} onClose={() => setError(null)} />
    </>
  );
}

type FileItemProps = {
  file: LogFile;
  entry: LogEntry | undefined;
  canPin: boolean;
  onError: (error: string) => void;
};

const FileItem = memo(function FileItem({ file: f, entry, canPin, onError }: FileItemProps) {
  const meta = [
    formatTime(f.created_at),
    entry ? `entry of ${formatTime(entry.created_at)}` : '',
    f.created_by,
    isPinned(f) ? `pinned by ${f.pinned_by ?? 'unknown'}` : '',
  ]
    .filter((part) => part !== '')
    .join(' · ');
  return (
    <li>
      <div className="content">
        <LogFileList files={[f]} canPin={canPin} onError={onError} />
        <p className="secondary">{meta}</p>
      </div>
    </li>
  );
});

export default FileListWidget;
