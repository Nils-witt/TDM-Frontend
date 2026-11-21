import { type FormEvent, useId, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  defaultPriorityLabels,
  messageSettingsApi,
  messageSettingsPath,
  useMessageSettings,
} from '@/api/messageSettings';
import { useResourceCache } from '@/api/resource';
import {
  FieldRow,
  FormActions,
  FormError,
  Section,
  SectionText,
  WidgetForm,
} from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { formatTime } from '../shared/logbookEntries';

type Draft = { labels: string[]; global: boolean };

const romans = ['I', 'II', 'III', 'IV'];

// The chat settings of the admins: the labels the priorities I–IV are shown
// by, and the Default scope's chat flag (other scopes have theirs in Scopes).
function MessageSettingsWidget() {
  const settings = useMessageSettings();
  const cache = useResourceCache();
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const id = useId();
  // null: unchanged, the stored settings show.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (settings.data === undefined && settings.error === null) return <Spinner compact />;

  const stored: Draft = {
    labels: settings.data?.priority_labels ?? defaultPriorityLabels,
    global: settings.data?.global_chat_enabled ?? false,
  };
  const shown = draft ?? stored;
  const valid = shown.labels.every((l) => l.trim() !== '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || !valid || busy) return;
    setBusy(true);
    try {
      const saved = await messageSettingsApi.replace({
        priority_labels: draft.labels.map((l) => l.trim()),
        global_chat_enabled: draft.global,
      });
      cache.put(messageSettingsPath, saved);
      setDraft(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SectionText>
        <span className="muted">
          Messages are sent within a mission scope. The chat is off until it is enabled here for
          Default and in Scopes for the others.
        </span>
      </SectionText>
      <WidgetForm onSubmit={(e) => void submit(e)}>
        <Section legend="Default scope">
          <label className="row">
            <input
              type="checkbox"
              checked={shown.global}
              disabled={offline || busy}
              onChange={(e) => setDraft({ ...shown, global: e.target.checked })}
            />
            <span>Chat enabled in Default</span>
          </label>
          <div className="row">
            <button type="button" className="btn" onClick={() => openWidget('Scopes')}>
              Other scopes…
            </button>
          </div>
        </Section>
        <Section legend="Priority labels">
          {shown.labels.map((label, i) => (
            <FieldRow key={i} id={`${id}-p${i}`} label={`Priority ${romans[i]}`} marked>
              <input
                id={`${id}-p${i}`}
                className="grow"
                value={label}
                maxLength={20}
                disabled={offline || busy}
                required
                onChange={(e) =>
                  setDraft({
                    ...shown,
                    labels: shown.labels.map((l, j) => (j === i ? e.target.value : l)),
                  })
                }
              />
            </FieldRow>
          ))}
          <SectionText>
            <span className="muted">
              I is the highest. Messages store the number, so a new label applies to every message.
            </span>
          </SectionText>
        </Section>
        <Section legend="Transmission ways">
          <SectionText>
            <span className="muted">
              How a message was transmitted besides the chat, picked when sending.
            </span>
          </SectionText>
          <div className="row">
            <button type="button" className="btn" onClick={() => openWidget('TransmissionWays')}>
              Transmission ways…
            </button>
          </div>
        </Section>
        <FormActions
          submitLabel="Save"
          busy={busy}
          canSubmit={draft !== null && valid && !offline}
          dirty={draft !== null}
          onDiscard={() => setDraft(null)}
        />
      </WidgetForm>
      {settings.data?.updated_at && (
        <SectionText>
          <span className="muted">
            Changed {formatTime(settings.data.updated_at)} · {settings.data.updated_by}
          </span>
        </SectionText>
      )}
      <FormError error={error ?? settings.error} onClose={() => setError(null)} />
    </div>
  );
}

export default MessageSettingsWidget;
