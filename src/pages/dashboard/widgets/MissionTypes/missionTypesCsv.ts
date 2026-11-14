import type { MissionType, MissionTypeGroup } from '@/api/catalogs';

// One row per mission type, group first; a row with an empty type is a group
// without types. An import creates the groups and types the file names that
// do not exist yet (by name, ignoring case), and sets the description of
// existing types if the file has that column. It never renames or deletes.
const csvHeader = ['group', 'type', 'description'] as const;

// description is null without the column, so an older file changes none.
export type CsvRow = { line: number; group: string; type: string; description: string | null };

export const delimiters = [
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
] as const;

export type Delimiter = (typeof delimiters)[number]['value'];

const fold = (s: string) => s.trim().toLocaleLowerCase();

// The one found most often outside quotes in the first line; comma if none is.
function detectDelimiter(s: string): Delimiter {
  const counts = new Map<string, number>();
  let quoted = false;
  for (const c of s) {
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === '\n' || c === '\r')) break;
    else if (!quoted) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best: Delimiter = ',';
  for (const { value } of delimiters) {
    if ((counts.get(value) ?? 0) > (counts.get(best) ?? 0)) best = value;
  }
  return best;
}

// RFC 4180 with quoted fields; the delimiter is detected from the header line.
// A leading byte order mark is ignored; blank lines are dropped. line is the
// file line each row starts on, so errors name it even after blank lines.
function parseCsv(text: string): { fields: string[]; line: number }[] {
  const s = text.startsWith('﻿') ? text.slice(1) : text;
  const sep = detectDelimiter(s);
  const rows: { fields: string[]; line: number }[] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  let line = 1;
  let rowLine = 1;
  const endRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push({ fields: row, line: rowLine });
    row = [];
    field = '';
  };
  while (i < s.length) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') quoted = false;
      else field += c;
      if (c === '\n' || (c === '\r' && s[i + 1] !== '\n')) line++;
      i++;
      continue;
    }
    if (c === '"' && field === '') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      endRow();
      if (c === '\r' && s[i + 1] === '\n') i++;
      rowLine = ++line;
    } else field += c;
    i++;
  }
  if (quoted) throw new Error('Unterminated quoted field at the end of the file');
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

// Quoted if it holds the delimiter, a quote or a line break.
function csvField(v: string, delimiter: Delimiter): string {
  return /["\r\n]/.test(v) || v.includes(delimiter) ? `"${v.replace(/"/g, '""')}"` : v;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// By group, then type; a group without types gets a row of its own.
export function toCsv(
  groups: readonly MissionTypeGroup[],
  types: readonly MissionType[],
  delimiter: Delimiter = ',',
): string {
  const lines = [csvHeader.join(delimiter)];
  const line = (...fields: string[]) =>
    lines.push(fields.map((v) => csvField(v, delimiter)).join(delimiter));
  for (const g of groups.toSorted(byName)) {
    const own = types.filter((t) => t.group_id === g.id).toSorted(byName);
    if (own.length === 0) line(g.name, '', '');
    for (const t of own) line(g.name, t.name, t.description ?? '');
  }
  return lines.join('\r\n') + '\r\n';
}

// Throws an error naming every bad line.
export function readRows(text: string): CsvRow[] {
  const [header, ...body] = parseCsv(text);
  if (!header) throw new Error('The file is empty');
  const col = (name: string) => header.fields.findIndex((h) => fold(h) === name);
  const groupCol = col('group');
  const typeCol = col('type');
  const descriptionCol = col('description');
  if (groupCol < 0) throw new Error('Missing column group');

  const problems: string[] = [];
  const seen = new Set<string>();
  const rows: CsvRow[] = [];
  for (const { fields, line } of body) {
    const group = (fields[groupCol] ?? '').trim();
    const type = typeCol < 0 ? '' : (fields[typeCol] ?? '').trim();
    const description = descriptionCol < 0 ? null : (fields[descriptionCol] ?? '').trim();
    const key = `${fold(group)}\u0000${fold(type)}`;
    if (group === '') problems.push(`line ${line}: group is empty`);
    else if (seen.has(key)) problems.push(`line ${line}: duplicate of an earlier row`);
    else {
      seen.add(key);
      rows.push({ line, group, type, description });
    }
  }
  if (problems.length > 0) throw new Error(`Invalid CSV: ${problems.join('; ')}`);
  return rows;
}

// A type of a group created by the same import names it by groupName alone.
export type ImportStep =
  | { kind: 'create-group'; row: CsvRow; name: string }
  | {
      kind: 'create-type';
      row: CsvRow;
      groupId: string | null;
      groupName: string;
      name: string;
      description: string;
    }
  | { kind: 'update-type'; row: CsvRow; id: string; name: string; description: string };

// Groups come before the types.
export type ImportPlan = { steps: ImportStep[]; unchanged: number };

export function planImport(
  rows: CsvRow[],
  groups: readonly MissionTypeGroup[],
  types: readonly MissionType[],
): ImportPlan {
  const groupByName = new Map(groups.map((g) => [fold(g.name), g]));
  const typeByKey = new Map(types.map((t) => [`${t.group_id}\u0000${fold(t.name)}`, t]));
  const groupSteps: ImportStep[] = [];
  const typeSteps: ImportStep[] = [];
  const newGroups = new Set<string>();
  let unchanged = 0;

  for (const r of rows) {
    const g = groupByName.get(fold(r.group));
    if (!g && !newGroups.has(fold(r.group))) {
      newGroups.add(fold(r.group));
      groupSteps.push({ kind: 'create-group', row: r, name: r.group });
    } else if (r.type === '') unchanged++;
    if (r.type === '') continue;
    const existing = g && typeByKey.get(`${g.id}\u0000${fold(r.type)}`);
    if (existing) {
      if (r.description === null || r.description === (existing.description ?? '')) unchanged++;
      else {
        typeSteps.push({
          kind: 'update-type',
          row: r,
          id: existing.id,
          name: existing.name,
          description: r.description,
        });
      }
      continue;
    }
    typeSteps.push({
      kind: 'create-type',
      row: r,
      groupId: g?.id ?? null,
      groupName: r.group,
      name: r.type,
      description: r.description ?? '',
    });
  }
  return { steps: [...groupSteps, ...typeSteps], unchanged };
}
