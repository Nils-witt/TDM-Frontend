import { type FormEvent, useId, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  mapSettingsApi,
  mapSettingsPath,
  mapStylesApi,
  resolveMapStyle,
  useMapSettings,
  useMapStyles,
  useOverlays,
} from '@/api/maps';
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

// What every map starts with: the basemap (the default map style, also set in
// Map Styles) and the overlays switched on. A map whose options pick a style
// keeps it; overlays a map or /m's Settings switched themselves stay as they
// are.
function MapAdminWidget() {
  return (
    <div>
      <SectionText>
        <span className="muted">
          What every map starts with. A Map widget whose options pick a style keeps it, and overlays
          a user switched on or off stay so.
        </span>
      </SectionText>
      <DefaultStyle />
      <DefaultOverlays />
    </div>
  );
}

// Saved on change, as in Map Styles' default column.
function DefaultStyle() {
  const styles = useMapStyles();
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const rows = styles.items.toSorted((a, b) => a.name.localeCompare(b.name));
  // Without a style marked default, maps show the first one.
  const current = resolveMapStyle(styles.items, '');

  const choose = async (styleId: string) => {
    setBusy(true);
    try {
      await mapStylesApi.patch(styleId, { is_default: true });
      setError(null);
      await styles.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section legend="Basemap">
      {styles.loading && rows.length === 0 ? (
        <Spinner compact />
      ) : (
        <FieldRow id={`${id}-style`} label="Default style">
          <select
            id={`${id}-style`}
            className="grow"
            value={current?.id ?? ''}
            disabled={offline || busy || rows.length === 0}
            onChange={(e) => void choose(e.target.value)}
          >
            {rows.length === 0 && <option value="">No map styles</option>}
            {rows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FieldRow>
      )}
      {current && (
        <SectionText>
          <span className="muted">{current.url}</span>
        </SectionText>
      )}
      <div className="row">
        <button type="button" className="btn" onClick={() => openWidget('MapStyles')}>
          Manage styles…
        </button>
      </div>
      <FormError error={error ?? styles.error} onClose={() => setError(null)} />
    </Section>
  );
}

function DefaultOverlays() {
  const { settings, error: loadError } = useMapSettings();
  const { overlays, error: overlaysError } = useOverlays();
  const cache = useResourceCache();
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  // null: unchanged, the stored list shows.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (overlaysError) {
    return (
      <Section legend="Overlays">
        <FormError error={`Overlays: ${overlaysError}`} onClose={() => undefined} />
      </Section>
    );
  }
  if (!overlays || (!settings && !loadError)) return <Spinner compact />;
  if (!overlays.enabled) {
    return (
      <Section legend="Overlays">
        <SectionText>
          <span className="muted">The API has no tile server, so there are no overlays.</span>
        </SectionText>
      </Section>
    );
  }

  const stored = settings?.default_overlays ?? [];
  const selected = draft ?? stored;
  const listedIds = new Set(overlays.overlays.map((o) => o.id));
  // Kept by the API when the tile server dropped them; unchecking removes them.
  const gone = selected.filter((id) => !listedIds.has(id));
  const dirty =
    draft !== null && (draft.length !== stored.length || draft.some((id) => !stored.includes(id)));

  const toggle = (overlayId: string, on: boolean) =>
    setDraft(on ? [...selected, overlayId] : selected.filter((x) => x !== overlayId));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || draft === null) return;
    setBusy(true);
    try {
      cache.put(mapSettingsPath, await mapSettingsApi.replace({ default_overlays: draft }));
      setDraft(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend="Overlays on by default" disabled={offline || busy || loadError !== null}>
        {overlays.overlays.length === 0 && gone.length === 0 && (
          <SectionText>
            <span className="muted">The tile server has no overlays.</span>
          </SectionText>
        )}
        {overlays.overlays.map((o) => (
          <label key={o.id} className="row" title={o.description || undefined}>
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              onChange={(e) => toggle(o.id, e.target.checked)}
            />
            {o.name || o.id}
            {o.description && <span className="muted">{o.description}</span>}
          </label>
        ))}
        {gone.map((overlayId) => (
          <label key={overlayId} className="row">
            <input type="checkbox" checked onChange={() => toggle(overlayId, false)} />
            <span className="muted">{overlayId} (no longer on the tile server)</span>
          </label>
        ))}
      </Section>
      <FormActions
        submitLabel="Save"
        busy={busy}
        canSubmit={dirty && !offline}
        dirty={dirty}
        onDiscard={() => setDraft(null)}
        aside={
          settings?.updated_at && (
            <span className="muted">
              {formatTime(settings.updated_at)} · {settings.updated_by}{' '}
              <button
                type="button"
                className="btn"
                onClick={() => openWidget('AuditLog', { entityType: 'map_settings', entityId: '' })}
              >
                History
              </button>
            </span>
          )
        }
      />
      <FormError error={error ?? loadError} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

export default MapAdminWidget;
