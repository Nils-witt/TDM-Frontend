import type { Mission } from '@/api/missions';
import { useNow } from '@/app/useNow';
import { useMissions } from '@/data/missionsContext';
import { useSelectedScope } from '@/data/selectedScope';
import type { ResolvedOptions } from '../widgetOptions';

export const windowUnits = [
  { value: 'minutes', label: 'minutes', singular: 'minute', ms: 60_000 },
  { value: 'hours', label: 'hours', singular: 'hour', ms: 3_600_000 },
  { value: 'days', label: 'days', singular: 'day', ms: 86_400_000 },
] as const;

// Any other status, one unknown to this build included, is active.
const inactiveStatuses = new Set(['draft', 'done', 'closed']);

// The API keeps no status history, so the last change stands in: a mission
// counts while active, and after it ended for as long as that change is within
// the frame. A mission changed in other ways after it ended counts longer.
function wasActiveSince(m: Mission, since: number): boolean {
  if (!inactiveStatuses.has(m.status)) return true;
  return m.status !== 'draft' && Date.parse(m.updated_at) > since;
}

// The first frame is set by the amount and unit options; frame n > 1 by
// amount<n> and unit<n>, off while its amount is 0.
export const frameCount = 4;

// n counts from 1.
export const frameKeys = (n: number) =>
  n === 1 ? { amount: 'amount', unit: 'unit' } : { amount: `amount${n}`, unit: `unit${n}` };

type Unit = (typeof windowUnits)[number];

// The last amount units, up to now.
type Frame = { amount: number; unit: Unit };

function framesOf(options: ResolvedOptions): Frame[] {
  const frames: Frame[] = [];
  for (let n = 1; n <= frameCount; n++) {
    const keys = frameKeys(n);
    const amount = Number(options[keys.amount]);
    if (!(amount > 0)) continue;
    const unit = windowUnits.find((u) => u.value === options[keys.unit]) ?? windowUnits[1];
    frames.push({ amount, unit });
  }
  return frames;
}

const periodOf = ({ amount, unit }: Frame) =>
  amount === 1 ? unit.singular : `${amount} ${unit.label}`;

// currentScopeOnly counts only the missions of the selected scope (null =
// Default).
export function useActiveMissionsWidget(options: ResolvedOptions) {
  const { items: loaded, error, loading } = useMissions();
  const { scopeId } = useSelectedScope();
  const missions =
    options.currentScopeOnly === true
      ? loaded.filter((m) => (m.scope ?? null) === scopeId)
      : loaded;
  const frames = framesOf(options);
  // The frames move on with time, missions leaving them without a change.
  const now = useNow(frames.some((f) => f.unit.value === 'minutes') ? 10_000 : 60_000);
  // A few frames over the missions: cheap enough for every render.
  const counts = frames.map((f) => ({
    period: periodOf(f),
    count: missions.filter((m) => wasActiveSince(m, now - f.amount * f.unit.ms)).length,
  }));
  return { counts, error, loading };
}
