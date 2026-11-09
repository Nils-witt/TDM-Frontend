import { useEffect, useSyncExternalStore } from 'react';

// The mission forms open in this window register here, so the menu bar's Save
// Mission action (⌘S) can submit one from anywhere.

type Entry = { form: HTMLFormElement; canSave: boolean };

let entries: Entry[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// The form holding the focus, else the one registered last.
function target(): Entry | null {
  const focused = entries.find((e) => e.form.contains(document.activeElement));
  return focused ?? entries.at(-1) ?? null;
}

const canSaveSnapshot = () => target()?.canSave ?? false;

// canSave: the form has edits it could save right now.
export function useRegisterMissionSave(form: HTMLFormElement | null, canSave: boolean) {
  useEffect(() => {
    if (!form) return;
    const entry = { form, canSave };
    entries = [...entries, entry];
    emit();
    return () => {
      entries = entries.filter((e) => e !== entry);
      emit();
    };
  }, [form, canSave]);
}

export const useCanSaveMission = () => useSyncExternalStore(subscribe, canSaveSnapshot);

// Runs the browser's required-field checks and the form's own save, as its Save
// button does.
export function saveMission() {
  const t = target();
  if (t?.canSave) t.form.requestSubmit();
}
