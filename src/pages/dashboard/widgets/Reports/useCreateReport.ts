import { useMemo, useState } from 'react';
import { useExportTemplates } from '@/api/exportTemplates';
import type { Mission } from '@/api/missions';
import { type Report, reportsApi } from '@/api/reports';
import { isFinished } from './reportHelpers';

type Options = {
  missions: readonly Mission[];
  // Picked first if finished: the one the dashboard selected, say.
  missionId: string | null;
  // The mission cannot be changed: only missionId is offered.
  locked?: boolean;
  onCreated: (r: Report) => void;
};

export type CreateReport = ReturnType<typeof useCreateReport>;

// Shared by the Reports widget's dialog and the Create Report window; the
// caller wraps the fields in its own form and calls submit from it.
export function useCreateReport({ missions, missionId, locked = false, onCreated }: Options) {
  const templates = useExportTemplates();
  const sortedTemplates = templates.items.toSorted((a, b) => a.name.localeCompare(b.name));
  const finished = useMemo(
    () =>
      missions
        .filter((m) => isFinished(m) && (!locked || m.id === missionId))
        .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [missions, locked, missionId],
  );
  const [pickedMission, setPickedMission] = useState(
    missionId && finished.some((m) => m.id === missionId) ? missionId : '',
  );
  const [pickedTemplate, setPickedTemplate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mission = pickedMission || finished[0]?.id || '';
  const template = pickedTemplate || sortedTemplates[0]?.id || '';

  const submit = async () => {
    if (mission === '' || template === '') return;
    setBusy(true);
    try {
      onCreated(await reportsApi.create(mission, template));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return {
    locked,
    templates,
    sortedTemplates,
    finished,
    mission,
    setPickedMission,
    template,
    setPickedTemplate,
    busy,
    error,
    setError,
    submit,
  };
}
