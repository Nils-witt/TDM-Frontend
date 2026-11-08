import { type FormEvent, useState } from 'react';
import {
  createMission,
  type Mission,
  type MissionFields,
  type MissionStatus,
  patchMission,
} from '@/api/missions';
import { useMissions } from '@/data/missionsContext';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';

export type TextKey =
  | 'occurred_event'
  | 'status'
  | 'address_street'
  | 'address_house_number'
  | 'address_city'
  | 'address_district'
  | 'address_object_name'
  | 'callee'
  | 'callee_phone';
export type CoordKey = 'lat' | 'lon';

// What is typed but not saved; every other field shows the mission's current
// value, so changes others save show up on reload. Coordinates are edited as
// text and parsed on save.
type Edits = Partial<Record<TextKey | CoordKey, string>>;

const coordText = (v: number | undefined) => (v === undefined ? '' : String(v));

// Blank is null (unknown); range checks are left to the API.
function parseCoord(text: string, label: string): number | null {
  if (text.trim() === '') return null;
  const v = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(v)) throw new Error(`${label} must be a number`);
  return v;
}

const blank: Pick<Mission, TextKey | 'mission_type' | 'address_coordinates'> = {
  occurred_event: '',
  status: 'draft',
  mission_type: null,
  address_street: '',
  address_house_number: '',
  address_city: '',
  address_district: '',
  address_object_name: '',
  address_coordinates: null,
  callee: '',
  callee_phone: '',
};

// Edits are kept until save sends them in one request. A closed mission is
// read-only. The occurred event can never be saved empty. Closing is final, so
// a save that closes the mission waits for confirmClose.
export function useMissionForm(mission: Mission | null, onSaved: (m: Mission) => Promise<void>) {
  const [edits, setEdits] = useState<Edits>({});
  // undefined while unchanged.
  const [typeEdit, setTypeEdit] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The request waiting for the confirmation of closing.
  const [pendingClose, setPendingClose] = useState<MissionFields | null>(null);
  // Changes whenever edits are discarded, so inputs holding state of their own,
  // as the mission type's group, drop it too.
  const [resetKey, setResetKey] = useState(0);
  const creating = mission === null;
  const readOnly = mission?.status === 'closed';
  const base = mission ?? blank;

  const value = (k: TextKey) => edits[k] ?? base[k];
  const coordValue = (k: CoordKey) => edits[k] ?? coordText(base.address_coordinates?.[k]);
  const set = (k: TextKey | CoordKey, v: string) => setEdits((e) => ({ ...e, [k]: v }));
  const typeValue = typeEdit === undefined ? base.mission_type : typeEdit;
  const typeChanged = typeEdit !== undefined && typeEdit !== base.mission_type;

  const changedText = (Object.keys(edits) as (TextKey | CoordKey)[]).filter(
    (k): k is TextKey => k !== 'lat' && k !== 'lon' && edits[k] !== base[k],
  );
  const coordsChanged = (['lat', 'lon'] as const).some(
    (k) => edits[k] !== undefined && edits[k] !== coordText(base.address_coordinates?.[k]),
  );
  const dirty = changedText.length > 0 || coordsChanged || typeChanged;
  const canSubmit = dirty && value('occurred_event').trim() !== '';

  // Unless they changed again meanwhile.
  const drop = (sent: Edits, sentType: string | null | undefined) => {
    setEdits((e) => {
      const next = { ...e };
      for (const [k, v] of Object.entries(sent) as [keyof Edits, string][]) {
        if (next[k] === v) delete next[k];
      }
      return next;
    });
    setTypeEdit((t) => (t === sentType ? undefined : t));
  };

  const send = async (body: MissionFields) => {
    const sent = { ...edits };
    const sentType = typeEdit;
    setBusy(true);
    try {
      const m = creating
        ? await createMission({ ...body, occurred_event: value('occurred_event') })
        : await patchMission(mission.id, body);
      drop(sent, sentType);
      setError(null);
      await onSaved(m);
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    const body: Record<string, unknown> = {};
    for (const k of changedText) body[k] = edits[k];
    if (coordsChanged) {
      let lat: number | null;
      let lon: number | null;
      try {
        lat = parseCoord(coordValue('lat'), 'Latitude');
        lon = parseCoord(coordValue('lon'), 'Longitude');
      } catch (err) {
        setError((err as Error).message);
        return;
      }
      if ((lat === null) !== (lon === null)) {
        setError('Latitude and longitude must be set together');
        return;
      }
      body.address_coordinates = lat === null || lon === null ? null : { lat, lon };
    }
    if (typeChanged) body.mission_type = typeEdit;
    if (body.status === 'closed') {
      setPendingClose(body as MissionFields);
      return;
    }
    try {
      await send(body as MissionFields);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Rejects, so the dialog shows the error.
  const confirmClose = async () => {
    if (pendingClose === null) return;
    await send(pendingClose);
    setPendingClose(null);
  };

  // A new mission's form is cleared, an existing mission's fields go back to
  // the last saved state.
  const discard = () => {
    setEdits({});
    setTypeEdit(undefined);
    setError(null);
    setResetKey((k) => k + 1);
  };

  // Unique per mission.
  const id = (k: string) => `mission-${mission?.id ?? 'new'}-${k}`;

  return {
    creating,
    readOnly,
    value,
    status: value('status') as MissionStatus,
    storedStatus: base.status,
    coordValue,
    set,
    typeValue,
    setType: setTypeEdit,
    dirty,
    canSubmit,
    busy,
    error,
    setError,
    save,
    discard,
    closing: pendingClose !== null,
    confirmClose,
    cancelClose: () => setPendingClose(null),
    resetKey,
    id,
  };
}

// The missions are reloaded after a save, so every widget shows the change.
export function useMissionDetailsWidget() {
  const { update } = useDashboard();
  const { mission } = useSelectedMission();
  const missions = useMissions();

  const onSaved = () => missions.reload();
  const onCreated = async (m: Mission) => {
    await missions.reload();
    update({ selectedId: m.id });
  };

  return {
    mission,
    error: missions.error,
    loading: missions.loading,
    onSaved,
    onCreated,
  };
}
