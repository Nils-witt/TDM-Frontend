import { type FormEvent, useMemo, useState } from 'react';
import {
  createMission,
  type Mission,
  type MissionFields,
  type MissionStatus,
  patchMission,
} from '@/api/missions';
import { useOffline } from '@/api/connectivity';
import { useMissions } from '@/data/missionsContext';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { useCatalogs } from '@/data/catalogContext';
import type { MissionScope } from '@/api/catalogs';
import { defaultScopeName, scopeOptions, useSelectedScope } from '@/data/selectedScope';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import { type MissionDraft, useRegisterMissionDraft } from './missionDrafts';

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
  // undefined while unchanged; null is Default.
  const [scopeEdit, setScopeEdit] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The request waiting for the confirmation of closing.
  const [pendingClose, setPendingClose] = useState<MissionFields | null>(null);
  // Changes whenever edits are discarded, so inputs holding state of their own,
  // as the mission type's group, drop it too.
  const [resetKey, setResetKey] = useState(0);
  const creating = mission === null;
  const offline = useOffline();
  const { scopeId } = useSelectedScope();
  const { scopes } = useCatalogs();
  const closed = mission?.status === 'closed';
  // Offline nothing can be saved, a new mission neither.
  const readOnly = closed || offline;
  const base = mission ?? blank;

  const value = (k: TextKey) => edits[k] ?? base[k];
  const coordValue = (k: CoordKey) => edits[k] ?? coordText(base.address_coordinates?.[k]);
  const set = (k: TextKey | CoordKey, v: string) => setEdits((e) => ({ ...e, [k]: v }));
  const typeValue = typeEdit === undefined ? base.mission_type : typeEdit;
  const typeChanged = typeEdit !== undefined && typeEdit !== base.mission_type;
  // A new mission starts in the tab's scope.
  const baseScope = creating ? scopeId : (mission.scope ?? null);
  const scopeValue = scopeEdit === undefined ? baseScope : scopeEdit;
  const scopeChanged = scopeEdit !== undefined && scopeEdit !== baseScope;

  const changedText = (Object.keys(edits) as (TextKey | CoordKey)[]).filter(
    (k): k is TextKey => k !== 'lat' && k !== 'lon' && edits[k] !== base[k],
  );
  const coordsChanged = (['lat', 'lon'] as const).some(
    (k) => edits[k] !== undefined && edits[k] !== coordText(base.address_coordinates?.[k]),
  );
  const dirty = changedText.length > 0 || coordsChanged || typeChanged || scopeChanged;
  const canSubmit = dirty && value('occurred_event').trim() !== '';

  // What the Map shows before the save. Coordinates only once both parse (or
  // both are blank), so a half-typed one doesn't move the pin.
  // Computed from the state itself rather than the derived values above,
  // which are new on every render.
  const draft = useMemo<MissionDraft | null>(() => {
    if (!mission || !dirty) return null;
    const d: Record<string, unknown> = {};
    for (const k of Object.keys(edits) as (TextKey | CoordKey)[]) {
      if (k !== 'lat' && k !== 'lon' && edits[k] !== mission[k]) d[k] = edits[k];
    }
    if (typeEdit !== undefined && typeEdit !== mission.mission_type) d.mission_type = typeEdit;
    const coord = (k: CoordKey) => edits[k] ?? coordText(mission.address_coordinates?.[k]);
    const coordEdited = (['lat', 'lon'] as const).some(
      (k) => edits[k] !== undefined && edits[k] !== coordText(mission.address_coordinates?.[k]),
    );
    if (coordEdited) {
      try {
        const lat = parseCoord(coord('lat'), 'Latitude');
        const lon = parseCoord(coord('lon'), 'Longitude');
        if (lat === null && lon === null) d.address_coordinates = null;
        else if (lat !== null && lon !== null) d.address_coordinates = { lat, lon };
      } catch {
        // Not a number yet.
      }
    }
    return d as MissionDraft;
  }, [mission, dirty, edits, typeEdit]);
  useRegisterMissionDraft(mission?.id ?? null, draft);

  // Unless they changed again meanwhile.
  const drop = (
    sent: Edits,
    sentType: string | null | undefined,
    sentScope: string | null | undefined,
  ) => {
    setEdits((e) => {
      const next = { ...e };
      for (const [k, v] of Object.entries(sent) as [keyof Edits, string][]) {
        if (next[k] === v) delete next[k];
      }
      return next;
    });
    setTypeEdit((t) => (t === sentType ? undefined : t));
    setScopeEdit((s) => (s === sentScope ? undefined : s));
  };

  const send = async (body: MissionFields) => {
    const sent = { ...edits };
    const sentType = typeEdit;
    const sentScope = scopeEdit;
    setBusy(true);
    try {
      if (creating) {
        const { status, scope: _scope, ...fields } = body;
        const draft = await createMission({
          ...fields,
          occurred_event: value('occurred_event'),
          scope: scopeValue,
        });
        let m = draft;
        if (status !== undefined && status !== 'draft') {
          try {
            m = await patchMission(draft.id, { status });
          } catch (err) {
            // The mission exists now, so the form must switch to it, or a
            // retry would create it twice. The status stays edited.
            const { status: _unsent, ...rest } = sent;
            drop(rest, sentType, sentScope);
            await onSaved(draft);
            throw new Error(
              `Created as draft, setting the status failed: ${(err as Error).message}`,
            );
          }
        }
        drop(sent, sentType, sentScope);
        setError(null);
        await onSaved(m);
        return;
      }
      const m = await patchMission(mission.id, body);
      drop(sent, sentType, sentScope);
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
    if (scopeChanged) body.scope = scopeEdit;
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
    setScopeEdit(undefined);
    setError(null);
    setResetKey((k) => k + 1);
  };

  // Unique per mission.
  const id = (k: string) => `mission-${mission?.id ?? 'new'}-${k}`;

  return {
    creating,
    closed,
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
    scopeValue,
    setScope: setScopeEdit,
    scopeChoices: scopeChoices(scopes.items, scopeValue),
  };
}

// Default (null) first; a deleted scope the mission is still in is kept as an
// option named by its ID, so it shows instead of silently changing.
function scopeChoices(
  scopes: readonly MissionScope[],
  current: string | null,
): { id: string | null; name: string }[] {
  const choices = [
    { id: null, name: defaultScopeName },
    ...scopeOptions(scopes).map((s) => ({ id: s.id, name: s.name })),
  ];
  if (current && !scopes.some((s) => s.id === current))
    choices.push({ id: current, name: current });
  return choices;
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
