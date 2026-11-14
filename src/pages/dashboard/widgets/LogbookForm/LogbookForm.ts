import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createLogEntry, maxUploadBytes } from '@/api/logbook';
import { useSession } from '@/app/session';
import { useCloseWidgetWindow } from '@/components/widgetWindow/widgetWindowContext';
import { useCatalogs } from '@/data/catalogContext';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { expandCommands, partyCommands } from '../shared/logbookCommands';
import { formatSize, partyValues } from '../shared/logbookEntries';
import { ocrKind, recognizeFile } from '../shared/ocr';

// The type choice for an entry without a type.
export const noType = '';

// null if not read, or skipped.
type OcrState =
  | { state: 'running'; progress: string }
  | { state: 'done' }
  | { state: 'error'; message: string }
  | null;

type Attachment = {
  key: number;
  file: File;
  name: string;
  // '' until a file type exists.
  typeId: string;
  contentText: string;
  ocr: OcrState;
};

let nextKey = 0;

// A file's type defaults to the first file type. OCR reads the text of
// images and PDFs as they are picked, filling the content text unless it was
// typed meanwhile; until it is read or skipped, the attachments are not ready.
function useAttachments(setError: (e: string | null) => void) {
  const fileTypes = useCatalogs().fileTypes.items;
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // By attachment key.
  const ocrJobs = useRef(new Map<number, AbortController>());

  const update = (key: number, change: Partial<Attachment>) =>
    setAttachments((list) => list.map((a) => (a.key === key ? { ...a, ...change } : a)));

  const stopOcr = (key: number) => {
    ocrJobs.current.get(key)?.abort();
    ocrJobs.current.delete(key);
  };

  // Fills the content text only if still empty.
  const startOcr = (a: Attachment) => {
    const ctrl = new AbortController();
    ocrJobs.current.set(a.key, ctrl);
    const set = (change: (a: Attachment) => Partial<Attachment>) => {
      if (ctrl.signal.aborted) return;
      setAttachments((list) => list.map((x) => (x.key === a.key ? { ...x, ...change(x) } : x)));
    };
    recognizeFile(a.file, {
      signal: ctrl.signal,
      onProgress: (progress) => set(() => ({ ocr: { state: 'running', progress } })),
    })
      .then((text) =>
        set((x) => ({
          ocr: { state: 'done' },
          contentText: x.contentText === '' ? text : x.contentText,
        })),
      )
      .catch((err: unknown) =>
        set(() => ({
          ocr: { state: 'error', message: `Reading the text failed: ${(err as Error).message}` },
        })),
      )
      .finally(() => {
        if (ocrJobs.current.get(a.key) === ctrl) ocrJobs.current.delete(a.key);
      });
  };

  // Jobs still running when the form goes away are aborted.
  useEffect(() => {
    const jobs = ocrJobs.current;
    return () => {
      for (const ctrl of jobs.values()) ctrl.abort();
      jobs.clear();
    };
  }, []);

  // The API limits the whole request, so files that would take it past the
  // limit are not added.
  const add = (files: FileList | null) => {
    let room = maxUploadBytes - attachments.reduce((n, a) => n + a.file.size, 0);
    const fitting: File[] = [];
    const skipped: string[] = [];
    for (const f of files ?? []) {
      if (f.size <= room) {
        fitting.push(f);
        room -= f.size;
      } else {
        skipped.push(f.name);
      }
    }
    if (skipped.length > 0) {
      setError(
        `${skipped.join(', ')}: an entry's files may be at most ${formatSize(maxUploadBytes)} together.`,
      );
    }
    const added = fitting.map((file): Attachment => ({
      key: nextKey++,
      file,
      name: file.name,
      typeId: fileTypes[0]?.id ?? '',
      contentText: '',
      ocr: ocrKind(file) ? { state: 'running', progress: 'waiting' } : null,
    }));
    setAttachments((list) => [...list, ...added]);
    for (const a of added) if (a.ocr) startOcr(a);
  };

  const remove = (key: number) => {
    stopOcr(key);
    setAttachments((list) => list.filter((a) => a.key !== key));
  };

  const skipOcr = (key: number) => {
    stopOcr(key);
    update(key, { ocr: null });
  };

  const clear = () => {
    for (const key of [...ocrJobs.current.keys()]) stopOcr(key);
    setAttachments([]);
  };

  // A chosen type deleted meanwhile falls back to the first one.
  const resolved = attachments.map((a) =>
    fileTypes.some((t) => t.id === a.typeId) ? a : { ...a, typeId: fileTypes[0]?.id ?? '' },
  );
  const ready = resolved.every(
    (a) => a.typeId !== '' && a.name.trim() !== '' && a.ocr?.state !== 'running',
  );

  return {
    attachments: resolved,
    fileTypes,
    add,
    update,
    remove,
    skipOcr,
    clear,
    ready,
  };
}

export type Attachments = ReturnType<typeof useAttachments>;

// The form is disabled while no mission is selected, and for a closed one.
// Commands in the sender, receiver and entry fields are expanded on adding.
// initialSender prefills the sender (the widget's sender option).
export function useLogbookFormWidget(initialSender = '') {
  const { mission, readOnly, logEntries, logFiles } = useSelectedMission();
  const { principal } = useSession();
  const ctx = useMemo(() => ({ mission, principal }), [mission, principal]);
  const types = useCatalogs().logbookTypes.items;
  // null until chosen: the first type, or none if there is none.
  const [typeChoice, setTypeChoice] = useState<string | null>(null);
  // A chosen type deleted meanwhile falls back to the default.
  const chosen =
    typeChoice !== null && (typeChoice === noType || types.some((t) => t.id === typeChoice))
      ? typeChoice
      : (types[0]?.id ?? noType);
  const [text, setText] = useState('');
  const [sender, setSender] = useState(initialSender);
  const [receiver, setReceiver] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const parties = useMemo(() => partyValues(logEntries.items), [logEntries.items]);
  const closeWindow = useCloseWidgetWindow();
  const files = useAttachments(setError);

  const disabled = mission === null || readOnly;
  const canAdd = !disabled && !busy && text.trim() !== '' && files.ready;

  // Focus the entry field once the form becomes usable.
  useEffect(() => {
    if (!disabled) textRef.current?.focus();
  }, [disabled]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!canAdd || mission === null) return;
    const expanded = [
      expandCommands(sender, ctx, partyCommands),
      expandCommands(receiver, ctx, partyCommands),
      expandCommands(text, ctx),
    ];
    const errors = expanded.flatMap((x) => ('errors' in x ? x.errors : []));
    if (errors.length > 0) {
      setError(errors.join(' '));
      return;
    }
    const [sent = '', received = '', body = ''] = expanded.map((x) => ('text' in x ? x.text : ''));
    setBusy(true);
    try {
      await createLogEntry(
        {
          mission: mission.id,
          type_id: chosen === noType ? null : chosen,
          text: body,
          sender: sent,
          receiver: received,
        },
        files.attachments.map((a) => ({
          file: a.file,
          type: a.typeId,
          name: a.name.trim(),
          content_text: a.contentText,
        })),
      );
      void logEntries.reload();
      void logFiles.reload();
      // In a window the form is done; on the grid it clears for the next entry.
      if (closeWindow) {
        closeWindow();
        return;
      }
      setText('');
      setSender('');
      setReceiver('');
      files.clear();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return {
    mission,
    ctx,
    parties,
    types,
    chosen,
    setTypeChoice,
    text,
    setText,
    textRef,
    sender,
    setSender,
    receiver,
    setReceiver,
    files,
    error,
    setError,
    readOnly,
    disabled,
    canAdd,
    add,
  };
}
