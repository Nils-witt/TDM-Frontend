import { memo, useState } from 'react';
import type { LogEntry, LogFile } from '@/api/logbook';
import { FormError } from '@/components/form';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { formatTime } from '../shared/logbookEntries';
import LogFileList from '../shared/LogFileList';
import { EmptyState, NoMission } from '../shared/WidgetStates';

// Newest first. Each file names the time of the entry it came with.
function FileListWidget() {
  const { mission, logFiles, logEntries } = useSelectedMission();
  const [ownError, setError] = useState<string | null>(null);
  const error = ownError ?? logFiles.error;

  return (
    <>
      {mission === null && <NoMission className="mt" />}
      {mission !== null &&
        !logFiles.loading &&
        (logFiles.items.length === 0 ? (
          <EmptyState>No files yet.</EmptyState>
        ) : (
          <ul className="list">
            {logFiles.items.map((f) => (
              <FileItem
                key={f.id}
                file={f}
                entry={logEntries.byId.get(f.entry)}
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
  onError: (error: string) => void;
};

const FileItem = memo(function FileItem({ file: f, entry, onError }: FileItemProps) {
  const meta = [
    formatTime(f.created_at),
    entry ? `entry of ${formatTime(entry.created_at)}` : '',
    f.created_by,
  ]
    .filter((part) => part !== '')
    .join(' · ');
  return (
    <li>
      <div className="content">
        <LogFileList files={[f]} onError={onError} />
        <p className="secondary">{meta}</p>
      </div>
    </li>
  );
});

export default FileListWidget;
