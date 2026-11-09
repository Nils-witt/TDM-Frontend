import { type CSSProperties, type FormEvent, useEffect, useId, useState } from 'react';
import type { Channel, ChannelEvent, Monitor } from '@/api/layouts';
import { menuBadgeClass } from '@/components/menu/menuClasses';
import {
  FieldRow,
  FormActions,
  FormError,
  Section,
  SectionText,
  WidgetForm,
} from '@/components/form';
import { useArrangement, useLayoutActions, useLayoutView } from '../layoutContext';
import MonitorArrangement from './MonitorArrangement';
import {
  channelColor,
  channelEvents,
  maxChannels,
  newChannel,
  setMembership,
  withoutMonitor,
} from './channels';
import { maxMonitors, newMonitor, widgetCount } from './monitors';
import styles from './Monitors.module.scss';

// A monitor's widgets are edited on that monitor.
function ArrangementEditor() {
  const { arrangement, saveArrangement } = useArrangement();
  const { updateArrangement, cancelArrangement } = useLayoutActions();
  const { monitor } = useLayoutView();
  const id = useId();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => monitor?.id ?? arrangement?.monitors[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Escape discards the changes, unless typed into a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, select, textarea, [contenteditable]')) return;
      if (e.key === 'Escape') cancelArrangement();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelArrangement]);

  if (!arrangement) return null;

  const { monitors, channels, target } = arrangement;
  const selected = monitors.find((m) => m.id === selectedId) ?? null;

  const setMonitors = (next: Monitor[]) => updateArrangement({ monitors: next });
  const change = (patch: Partial<Monitor>) => {
    if (!selected) return;
    setMonitors(monitors.map((m) => (m.id === selected.id ? { ...m, ...patch } : m)));
  };

  const setChannels = (next: Channel[]) => updateArrangement({ channels: next });
  const changeChannel = (id: string, patch: Partial<Channel>) =>
    setChannels(channels.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const toggleEvent = (c: Channel, event: ChannelEvent, on: boolean) =>
    changeChannel(c.id, {
      events: on ? [...c.events, event] : c.events.filter((e) => e !== event),
    });

  const addChannel = () => {
    const c = newChannel(channels);
    // A new channel starts with the selected monitor.
    setChannels([...channels, selected ? { ...c, monitors: [selected.id] } : c]);
  };

  const removeChannel = (c: Channel) => {
    if (c.monitors.length > 0 && !window.confirm(`Remove the channel “${c.name}”?`)) return;
    setChannels(channels.filter((x) => x.id !== c.id));
  };

  const add = () => {
    const m = newMonitor(monitors);
    setMonitors([...monitors, m]);
    setSelectedId(m.id);
  };

  const remove = () => {
    if (!selected || monitors.length <= 1) return;
    if (
      selected.widgets.length > 0 &&
      !window.confirm(`Remove “${selected.name}” and its ${widgetCount(selected)}?`)
    ) {
      return;
    }
    const next = monitors.filter((m) => m.id !== selected.id);
    updateArrangement({ monitors: next, channels: withoutMonitor(channels, selected.id) });
    setSelectedId(next[0]?.id ?? null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    saveArrangement().then(
      () => setSaving(false),
      (err: unknown) => {
        setSaving(false);
        setError(err instanceof Error ? err.message : String(err));
      },
    );
  };

  const size = (v: string) => Math.max(1, Math.round(Number(v) || 1));
  const unnamed = monitors.some((m) => !m.name.trim()) || channels.some((c) => !c.name.trim());

  return (
    <div className={styles.screen}>
      <WidgetForm
        className={`card ${styles.editor}`}
        onSubmit={onSubmit}
        aria-label="Edit monitors"
      >
        <div className={styles.row}>
          <input
            aria-label="Layout name"
            placeholder="Layout name"
            value={arrangement.name}
            required
            onChange={(e) => updateArrangement({ name: e.target.value })}
          />
          <span className={menuBadgeClass}>
            {target.scope === 'global' ? 'Shared' : 'My layout'}
          </span>
          <button
            type="button"
            className="btn"
            onClick={add}
            disabled={monitors.length >= maxMonitors}
          >
            Add monitor
          </button>
          <span className={styles.spacer} />
          <FormActions
            submitLabel="Save"
            canSubmit={arrangement.name.trim() !== '' && !unnamed}
            busy={saving}
            onDiscard={cancelArrangement}
            discardLabel="Cancel"
          />
        </div>
        <FormError error={error} onClose={() => setError(null)} />
        <div className={styles.body}>
          <div className={styles.canvas}>
            <MonitorArrangement
              monitors={monitors}
              selected={selectedId}
              onSelect={setSelectedId}
              onChange={setMonitors}
              detail={widgetCount}
              channels={channels}
              label="Monitor arrangement"
            />
          </div>
          <div className={styles.side}>
            {selected && (
              <Section legend="Monitor" className={styles.panel}>
                <FieldRow id={`${id}-name`} label="Name">
                  <input
                    id={`${id}-name`}
                    className="grow"
                    value={selected.name}
                    required
                    onChange={(e) => change({ name: e.target.value })}
                  />
                </FieldRow>
                <FieldRow id={`${id}-width`} label="Width">
                  <input
                    id={`${id}-width`}
                    className="grow"
                    type="number"
                    min={1}
                    value={selected.width}
                    onChange={(e) => change({ width: size(e.target.value) })}
                  />
                </FieldRow>
                <FieldRow id={`${id}-height`} label="Height">
                  <input
                    id={`${id}-height`}
                    className="grow"
                    type="number"
                    min={1}
                    value={selected.height}
                    onChange={(e) => change({ height: size(e.target.value) })}
                  />
                </FieldRow>
                <fieldset className={styles.memberships}>
                  <legend>Channels</legend>
                  {channels.length === 0 && <span className="muted">No channels</span>}
                  {channels.map((c) => (
                    <label
                      key={c.id}
                      className="row"
                      style={{ '--channel': channelColor(c) } as CSSProperties}
                    >
                      <input
                        type="checkbox"
                        checked={c.monitors.includes(selected.id)}
                        onChange={(e) =>
                          setChannels(setMembership(channels, selected.id, c.id, e.target.checked))
                        }
                      />
                      <span className={styles.dot} aria-hidden="true" />
                      {c.name}
                    </label>
                  ))}
                </fieldset>
                <SectionText>
                  <span className="muted">
                    {widgetCount(selected)}. Drag monitors to arrange them as they stand on the
                    desk; drag the corner to resize. Edit a monitor's widgets in the window showing
                    it.
                  </span>
                </SectionText>
                <div className="row">
                  <button
                    type="button"
                    className="btn"
                    onClick={remove}
                    disabled={monitors.length <= 1}
                  >
                    Remove monitor
                  </button>
                </div>
              </Section>
            )}
            <Section legend="Channels" className={styles.panel}>
              <SectionText>
                <span className="muted">
                  Monitors in a channel share events: an item selected on one is selected on the
                  others.
                </span>
              </SectionText>
              {channels.map((c) => (
                <div
                  key={c.id}
                  className={styles.channel}
                  style={{ '--channel': channelColor(c) } as CSSProperties}
                >
                  <div className={styles.channelHead}>
                    <span className={styles.dot} aria-hidden="true" />
                    <input
                      aria-label="Channel name"
                      value={c.name}
                      required
                      onChange={(e) => changeChannel(c.id, { name: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn"
                      aria-label={`Remove channel ${c.name}`}
                      title="Remove channel"
                      onClick={() => removeChannel(c)}
                    >
                      ✕
                    </button>
                  </div>
                  {channelEvents.map(({ event, label }) => (
                    <label key={event} className="row">
                      <input
                        type="checkbox"
                        checked={c.events.includes(event)}
                        onChange={(e) => toggleEvent(c, event, e.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                  <span className={styles.members}>
                    {c.monitors.length === 0
                      ? 'No monitors'
                      : c.monitors
                          .map((mid) => monitors.find((m) => m.id === mid)?.name ?? mid)
                          .join(', ')}
                  </span>
                </div>
              ))}
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  onClick={addChannel}
                  disabled={channels.length >= maxChannels}
                >
                  Add channel
                </button>
              </div>
            </Section>
          </div>
        </div>
      </WidgetForm>
    </div>
  );
}

export default ArrangementEditor;
