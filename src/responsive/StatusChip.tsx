import { missionStatuses } from '@/api/missions';

// A status unknown to this build, written by a newer API, is shown as is.
function StatusChip({ status }: { status: string }) {
  const s = missionStatuses.find((x) => x.value === status);
  return <span className={`chip ${s?.chip ?? 'outlined'}`.trim()}>{s?.label ?? status}</span>;
}

export default StatusChip;
