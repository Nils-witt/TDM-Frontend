import { useCallback, useState } from 'react';
import { isPinned, type LogFile, pinLogFile } from '@/api/logbook';
import { useReplica } from '@/api/replica';

// Pinned files first, most recently pinned on top; the rest keep their order.
export function pinnedFirst(files: readonly LogFile[]): LogFile[] {
  const pinned = files
    .filter(isPinned)
    .sort((a, b) => (b.pinned_at ?? '').localeCompare(a.pinned_at ?? ''));
  return pinned.length === 0 ? [...files] : [...pinned, ...files.filter((f) => !isPinned(f))];
}

// The answer goes into the replica, so every list shows the pin before the
// change event's sync confirms it.
export function useFilePin(onError: (error: string) => void) {
  const replica = useReplica();
  const [pinning, setPinning] = useState<string | null>(null);
  const toggle = useCallback(
    (f: LogFile) => {
      setPinning(f.id);
      pinLogFile(f.id, !isPinned(f))
        .then((updated) => replica.put('log_files', updated))
        .catch((err: unknown) => onError((err as Error).message))
        .finally(() => setPinning(null));
    },
    [replica, onError],
  );
  return { pinning, toggle };
}

export const pinLabel = (f: LogFile) =>
  isPinned(f) ? `Unpin (pinned by ${f.pinned_by ?? 'unknown'})` : 'Pin to mission';
