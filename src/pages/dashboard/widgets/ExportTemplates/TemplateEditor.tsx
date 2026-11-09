import { type FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { type ExportTemplate, exportTemplatesApi } from '@/api/exportTemplates';
import { FieldRow, FormActions, WidgetForm } from '@/components/form';
import { useMissions } from '@/data/missionsContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import CodeEditor from './CodeEditor';
import VariablesReference from './VariablesReference';
import styles from './ExportTemplates.module.scss';

type Props = {
  // null for a new one.
  template: ExportTemplate | null;
  starter: string;
  onSave: (input: { name: string; source: string }) => Promise<void>;
  onCancel: () => void;
};

const previewDelay = 400;

// The live preview renders a picked mission, the dashboard's selected one by
// default.
export function TemplateEditor({ template, starter, onSave, onCancel }: Props) {
  const id = useId();
  const [name, setName] = useState(template?.name ?? '');
  const [source, setSource] = useState(template?.source ?? starter);
  const [busy, setBusy] = useState(false);
  const { selectedId } = useDashboard();
  const missions = useMissions();
  const [missionId, setMissionId] = useState<string>(selectedId ?? '');
  const options = useMemo(
    () => missions.items.toSorted((a, b) => b.created_at.localeCompare(a.created_at)),
    [missions.items],
  );
  const previewMission = missionId || options[0]?.id || '';
  const preview = usePreview(previewMission, source);

  const dirty = template === null || name !== template.name || source !== template.source;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || name.trim() === '') return;
    setBusy(true);
    try {
      await onSave({ name: name.trim(), source });
    } finally {
      setBusy(false);
    }
  };

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <FieldRow id={`${id}-name`} label="Name" marked>
        <input
          id={`${id}-name`}
          className="grow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
          autoFocus
          placeholder="Mission report"
        />
      </FieldRow>
      <div className={styles.editor}>
        <div className={styles.source}>
          <CodeEditor
            id={`${id}-source`}
            label="Template source"
            value={source}
            onChange={setSource}
          />
          <VariablesReference />
        </div>
        <div className={styles.previewPane}>
          <FieldRow id={`${id}-mission`} label="Preview with">
            <select
              id={`${id}-mission`}
              className="grow"
              value={previewMission}
              onChange={(e) => setMissionId(e.target.value)}
            >
              {previewMission !== '' && !options.some((m) => m.id === previewMission) && (
                <option value={previewMission}>Selected mission</option>
              )}
              {options.length === 0 && previewMission === '' && (
                <option value="">No missions</option>
              )}
              {options.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.occurred_event}
                </option>
              ))}
            </select>
          </FieldRow>
          {preview.error !== null ? (
            <pre className={styles.previewError} role="alert">
              {preview.error}
            </pre>
          ) : (
            <iframe
              className={styles.preview}
              title="Preview"
              // No scripts run, and the page cannot reach the app.
              sandbox=""
              srcDoc={preview.html}
            />
          )}
        </div>
      </div>
      <FormActions
        submitLabel={template === null ? 'Add template' : 'Save'}
        canSubmit={name.trim() !== '' && dirty}
        busy={busy}
        onDiscard={onCancel}
        discardLabel="Cancel"
      />
    </WidgetForm>
  );
}

// Renders a while after either last changed; error is why it failed, such as
// the template's line with a syntax error.
function usePreview(missionId: string, source: string) {
  const [state, setState] = useState<{ html: string; error: string | null }>({
    html: '',
    error: null,
  });

  useEffect(() => {
    if (missionId === '') return;
    let current = true;
    const timer = window.setTimeout(() => {
      exportTemplatesApi.preview(missionId, source).then(
        (html) => current && setState({ html, error: null }),
        (err: Error) => current && setState((s) => ({ ...s, error: err.message })),
      );
    }, previewDelay);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [missionId, source]);

  return missionId === ''
    ? { html: '', error: 'Pick a mission to preview the template with.' }
    : state;
}
