import { type MissionStatus, missionStatuses } from '@/api/missions';

// A status unknown to this build, written by a newer API, is shown as is.
export function StatusChip({ status }: { status: string }) {
  const s = missionStatuses.find((x) => x.value === status);
  return <span className={`chip ${s?.chip ?? 'outlined'}`.trim()}>{s?.label ?? status}</span>;
}

// stored is the mission's saved status: once it left draft, the API does not
// let it return. A status unknown to this build is kept as an extra option, so
// it shows instead of silently changing.
export function StatusSelect({
  id,
  value,
  stored,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  stored: string;
  onChange: (v: MissionStatus) => void;
  className?: string;
}) {
  const known = missionStatuses.some((s) => s.value === value);
  return (
    <select
      id={id}
      className={className}
      aria-label={id ? undefined : 'Status'}
      value={value}
      onChange={(e) => onChange(e.target.value as MissionStatus)}
    >
      {!known && <option value={value}>{value}</option>}
      {missionStatuses.map((s) => (
        <option key={s.value} value={s.value} disabled={s.value === 'draft' && stored !== 'draft'}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
