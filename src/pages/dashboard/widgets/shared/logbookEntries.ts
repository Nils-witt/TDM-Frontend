import type { LogEntry, LogFile } from '@/api/logbook';

// Such as "1.2 MB".
export function formatSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['kB', 'MB', 'GB'];
  let v = bytes / 1000;
  let i = 0;
  for (; v >= 1000 && i < units.length - 1; i++) v /= 1000;
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

// "DD.MM.YYYY HH:mm", local time.
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "sender → receiver", a blank side for the one not given, "" if neither is.
export function formatParties(e: Pick<LogEntry, 'sender' | 'receiver'>): string {
  if (e.sender === '' && e.receiver === '') return '';
  return `${e.sender} → ${e.receiver}`.trim();
}

// Each part matches case-insensitively as a substring; empty matches every
// entry.
export type PartyFilter = { sender: string; receiver: string };

// The filter is normalized once, not per entry.
export function partiesMatcher(
  filter: PartyFilter,
): (e: Pick<LogEntry, 'sender' | 'receiver'>) => boolean {
  const sender = filter.sender.trim().toLowerCase();
  const receiver = filter.receiver.trim().toLowerCase();
  const has = (party: string, q: string) => q === '' || party.toLowerCase().includes(q);
  return (e) => has(e.sender, sender) && has(e.receiver, receiver);
}

// Logbook type IDs, noType for entries without one; empty matches every entry.
export type TypeFilter = ReadonlySet<string>;

export const noType = '';

export const typeFilterValue = (e: Pick<LogEntry, 'type_id'>) => e.type_id ?? noType;

export const matchesType = (e: Pick<LogEntry, 'type_id'>, filter: TypeFilter) =>
  filter.size === 0 || filter.has(typeFilterValue(e));

// entries are listed newest first; the result is most recently used first.
export function partyValues(entries: readonly Pick<LogEntry, 'sender' | 'receiver'>[]): string[] {
  const seen = new Set<string>();
  for (const e of entries) {
    for (const v of [e.sender, e.receiver]) if (v !== '') seen.add(v);
  }
  return [...seen];
}

const noFiles: readonly LogFile[] = [];

// Files are listed newest first; each entry's come out oldest first, in the
// order they were attached.
export function filesByEntry(files: readonly LogFile[]): (entryId: string) => readonly LogFile[] {
  const byEntry = new Map<string, LogFile[]>();
  for (const f of files.toReversed()) {
    const list = byEntry.get(f.entry);
    if (list) list.push(f);
    else byEntry.set(f.entry, [f]);
  }
  return (entryId) => byEntry.get(entryId) ?? noFiles;
}
