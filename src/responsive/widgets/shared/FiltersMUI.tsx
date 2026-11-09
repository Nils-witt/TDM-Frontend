import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useMemo } from 'react';
import type { LogEntry } from '@/api/logbook';
import { useCatalogs } from '@/data/catalogContext';
import {
  noType,
  type PartyFilter,
  type TypeFilter,
  typeFilterValue,
} from '@/pages/dashboard/widgets/shared/logbookEntries';

// As TypeFilterInput: the logbook types, "No type", and types entries use that
// are no longer in the catalog. Nothing selected shows every entry.
export function TypeFilterMUI({
  entries,
  filter,
  onChange,
}: {
  entries: readonly Pick<LogEntry, 'type_id'>[];
  filter: TypeFilter;
  onChange: (filter: TypeFilter) => void;
}) {
  const { logbookTypes } = useCatalogs();
  const options = useMemo(() => {
    const defined = [...logbookTypes.items]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({ value: t.id, label: t.name }));
    const known = new Set(defined.map((o) => o.value));
    const unknown = new Set(
      entries.map(typeFilterValue).filter((v) => v !== noType && !known.has(v)),
    );
    return [
      ...defined,
      { value: noType, label: 'No type' },
      ...[...unknown].map((v) => ({ value: v, label: 'Unknown type' })),
    ];
  }, [entries, logbookTypes.items]);

  return (
    <TextField
      select
      label="Type"
      size="small"
      value={[...filter]}
      onChange={(e) => {
        const v = e.target.value as unknown as string[] | string;
        onChange(new Set(typeof v === 'string' ? v.split(',') : v));
      }}
      slotProps={{
        select: {
          multiple: true,
          displayEmpty: true,
          renderValue: () => (filter.size === 0 ? 'All types' : `Types: ${filter.size} selected`),
        },
        inputLabel: { shrink: true },
      }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          <Checkbox size="small" checked={filter.has(o.value)} sx={{ py: 0 }} />
          <ListItemText primary={o.label} />
        </MenuItem>
      ))}
    </TextField>
  );
}

// As PartyFilterInputs: both must match.
export function PartyFilterMUI({
  filter,
  onChange,
}: {
  filter: PartyFilter;
  onChange: (filter: PartyFilter) => void;
}) {
  return (
    <>
      <TextField
        type="search"
        size="small"
        label="Sender"
        value={filter.sender}
        onChange={(e) => onChange({ ...filter, sender: e.target.value })}
        placeholder="Filter by sender"
      />
      <TextField
        type="search"
        size="small"
        label="Receiver"
        value={filter.receiver}
        onChange={(e) => onChange({ ...filter, receiver: e.target.value })}
        placeholder="Filter by receiver"
      />
    </>
  );
}
