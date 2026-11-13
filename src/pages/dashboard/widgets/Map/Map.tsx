import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type RequestTransformFunction,
  setWorkerUrl,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl, authHeaders } from '@/api/client';
import type { Coordinates } from '@/api/missions';
import {
  fetchOverlayBounds,
  type OverlayBounds,
  overlayTilePath,
  resolveMapStyle,
  useMapStyles,
  useDefaultOverlayStates,
  useOverlays,
} from '@/api/maps';
import Alert from '@/components/Alert';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FieldRow, SectionText } from '@/components/form';
import { LocationIcon } from '@/components/icons';
import ContextMenu from '@/components/menu/ContextMenu';
import MenuItem from '@/components/menu/MenuItem';
import type { Point } from '@/components/menu/useContextMenu';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import type { WidgetProps } from '../widgetOptions';
import { type MapMarker, type UnitMarker, useMapMarkers, useMapUnits } from './Map.ts';
import { formatPlace, useMapActions } from './mapActions';
import styles from './Map.module.scss';
import OverlaySwitcher from './OverlaySwitcher';
import { defaultOverlayState, parseOverlayStates, type OverlayState } from './overlayState';
import { useWidgetState } from '../widgetState';

// MapLibre looks for its worker next to its own module, which Vite bundles
// away; point it at the worker file Vite serves as an asset instead.
setWorkerUrl(workerUrl);

// The least zoom the map flies to for the selected mission.
const selectedZoom = 15;

// As long as Android waits before its context menu.
const longPressMs = 500;

// MapLibre loads tiles itself, so it needs absolute URLs.
const absolute = (url: string) => new URL(url, window.location.href).href;

// The overlay tiles come from the API, which needs the token (or the client
// certificate, hence credentials). Nothing else gets them: the styles and
// basemap tiles are other origins.
const transformRequest: RequestTransformFunction = (url) =>
  url.startsWith(absolute(apiUrl('/api/v1/overlays/')))
    ? { url, headers: authHeaders(), credentials: 'include' }
    : { url };

function markerElement(m: MapMarker, onClick: () => void): HTMLElement {
  // MapLibre positions the element by its transform, so the pin's shape is
  // drawn by an element inside it.
  const el = document.createElement('button');
  el.type = 'button';
  el.className = styles.marker;
  el.dataset.status = m.status;
  el.title = m.unsaved ? `${m.title}\n(unsaved)` : m.title;
  el.setAttribute('aria-label', el.title);
  el.setAttribute('aria-pressed', String(m.selected));
  if (m.selected) el.classList.add(styles.selected);
  if (m.unsaved) el.classList.add(styles.unsaved);
  const pin = document.createElement('span');
  pin.className = styles.pin;
  pin.setAttribute('aria-hidden', 'true');
  const dot = document.createElement('span');
  dot.className = styles.dot;
  pin.append(dot);
  el.append(pin);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

// A unit is its tactical symbol with its FMS status in a corner, or without a
// symbol a label with its status and short call sign; the short call sign is
// also shown below a symbol that does not name the unit. Centered on its
// position; one on a mission selects that mission when clicked.
function unitElement(u: UnitMarker, onClick: (() => void) | null): HTMLElement {
  const el = document.createElement(onClick ? 'button' : 'div');
  if (el instanceof HTMLButtonElement) el.type = 'button';
  el.className = styles.unit;
  if (u.tone) el.dataset.tone = u.tone;
  if (u.selected) el.classList.add(styles.selected);
  el.title = u.missionId ? u.title : `${u.title}\n(no mission)`;
  el.setAttribute('aria-label', el.title.replaceAll('\n', ', '));
  const status = document.createElement('span');
  status.className = styles.unitStatus;
  status.textContent = u.status === null ? '–' : String(u.status);
  const label = document.createElement('span');
  label.className = styles.unitLabel;
  label.textContent = u.label;
  if (u.symbol) {
    el.classList.add(styles.withSymbol);
    const img = document.createElement('img');
    img.className = styles.unitSymbol;
    img.src = u.symbol;
    img.alt = '';
    el.append(img, status);
    if (!u.symbolNamed) el.append(label);
  } else {
    const chip = document.createElement('span');
    chip.className = styles.unitChip;
    chip.append(status, label);
    el.append(chip);
  }
  if (onClick) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
  }
  return el;
}

// Of the MapLibre source and layer.
const overlaySourceId = (id: string) => `overlay-${id}`;

// Overlays are drawn above the style's layers, in the order turned on; the
// mission markers stay above them. Overlays whose bounds are not known yet are
// skipped.
function applyOverlays(
  m: MapLibreMap,
  state: Readonly<Record<string, OverlayState>>,
  bounds: Readonly<Record<string, OverlayBounds>>,
) {
  for (const [id, s] of Object.entries(state)) {
    const key = overlaySourceId(id);
    const b = bounds[id];
    console.log(overlayTilePath(id), apiUrl(overlayTilePath(id)));
    if (s.on && b) {
      if (!m.getSource(key)) {
        m.addSource(key, {
          type: 'raster',
          tiles: [apiUrl(overlayTilePath(id))],
          tileSize: 256,
          bounds: [b.west, b.south, b.east, b.north],
          minzoom: b.min_zoom,
          maxzoom: b.max_zoom,
        });
      }
      if (!m.getLayer(key)) {
        m.addLayer({ id: key, type: 'raster', source: key });
      }
      m.setPaintProperty(key, 'raster-opacity', s.opacity);
    } else {
      if (m.getLayer(key)) m.removeLayer(key);
      if (m.getSource(key)) m.removeSource(key);
    }
  }
}

export type OverlayControl = {
  state: Readonly<Record<string, OverlayState>>;
  onChange: (id: string, state: OverlayState) => void;
};

const noOverlays: Record<string, OverlayState> = {};

// The overlays admins switched on by default (Map Admin) start on, until the
// map's own state switches them. Without overlayControl the map keeps that
// state and shows a switcher; with it the caller keeps the state and offers
// the switch elsewhere (the responsive UI's Settings). show-<status> off leaves those missions out,
// except the selected one.
export function MissionMap({
  options,
  selectedId,
  onSelect: select,
  overlayControl,
  onViewChange,
  onContextMenu,
  notice,
}: WidgetProps & {
  selectedId: string | null;
  onSelect: (id: string) => void;
  overlayControl?: OverlayControl;
  // Called after each pan or zoom (and fly to the selected mission).
  onViewChange?: (view: { latitude: number; longitude: number; zoom: number }) => void;
  // A right click or long press on the map, with the viewport point and the
  // position under it; without it the browser's own menu shows.
  onContextMenu?: (at: Point, position: Coordinates) => void;
  // Shown with the map's own alerts.
  notice?: ReactNode;
}) {
  const { markers, selected, error } = useMapMarkers(options, selectedId);
  const { units, error: unitsError } = useMapUnits(options, selectedId);
  const mapStyles = useMapStyles();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const { overlays, error: overlaysError } = useOverlays();
  // Kept per dashboard widget, so a reload keeps each map's overlays.
  const [ownOverlayState, setOwnOverlayState] = useWidgetState<Record<string, OverlayState>>(
    'overlays',
    noOverlays,
    parseOverlayStates,
  );
  const defaultOverlays = useDefaultOverlayStates();
  const ownOrControlled = overlayControl?.state ?? ownOverlayState;
  const overlayState = useMemo(
    () => ({ ...defaultOverlays, ...ownOrControlled }),
    [defaultOverlays, ownOrControlled],
  );
  const setOverlay =
    overlayControl?.onChange ??
    ((id: string, st: OverlayState) => setOwnOverlayState((prev) => ({ ...prev, [id]: st })));
  // Lets the bounds' callbacks turn an overlay off with the latest setter and
  // state.
  const overlayRef = useRef({ overlayState, setOverlay });
  useEffect(() => {
    overlayRef.current = { overlayState, setOverlay };
  });
  const [overlayBounds, setOverlayBounds] = useState<Record<string, OverlayBounds>>({});
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const boundsLoading = useRef(new Set<string>());
  // Setting a style drops the overlays' layers, so they are added again on each
  // load.
  const [styleLoads, setStyleLoads] = useState(0);
  // undefined until the styles are loaded.
  const styleUrl = resolveMapStyle(mapStyles.items, String(options.style))?.url;
  const latitude = Number(options.latitude);
  const longitude = Number(options.longitude);
  const zoom = Number(options.zoom);
  // The view the map is created with; the effects below apply later changes.
  const initial = useRef({ latitude, longitude, zoom });
  // Lets the markers' click handlers call the latest select.
  const selectRef = useRef(select);
  const viewChangeRef = useRef(onViewChange);
  const contextMenuRef = useRef(onContextMenu);
  useEffect(() => {
    selectRef.current = select;
    viewChangeRef.current = onViewChange;
    contextMenuRef.current = onContextMenu;
  });

  // Created once, sized to the widget as its frame is resized; the style is set
  // once the styles are loaded.
  useEffect(() => {
    if (!container.current) return;
    const i = initial.current;
    const m = new MapLibreMap({
      container: container.current,
      center: [i.longitude, i.latitude],
      zoom: i.zoom,
      attributionControl: false,
      transformRequest,
    });
    m.addControl(new NavigationControl(), 'top-right');
    m.on('style.load', () => setStyleLoads((n) => n + 1));
    m.on('moveend', () => {
      const { lng, lat } = m.getCenter();
      viewChangeRef.current?.({ latitude: lat, longitude: lng, zoom: m.getZoom() });
    });
    // Past the antimeridian the map repeats; the API wants -180..180.
    const openMenu = (x: number, y: number, at: { lng: number; lat: number }) =>
      contextMenuRef.current?.({ x, y }, { lat: at.lat, lon: at.lng });
    // iOS fires no contextmenu on a long press, Android does; whichever comes
    // first opens the menu, and the other is ignored.
    let pressTimer: ReturnType<typeof setTimeout> | undefined;
    let pressStart: { x: number; y: number } | null = null;
    let pressedAt = 0;
    const cancelPress = () => {
      clearTimeout(pressTimer);
      pressStart = null;
    };
    m.on('contextmenu', (e) => {
      if (!contextMenuRef.current) return;
      e.originalEvent.preventDefault();
      cancelPress();
      if (Date.now() - pressedAt < 1000) return;
      openMenu(e.originalEvent.clientX, e.originalEvent.clientY, e.lngLat.wrap());
    });
    m.on('touchstart', (e) => {
      cancelPress();
      const touches = e.originalEvent.touches;
      if (!contextMenuRef.current || touches.length !== 1) return;
      const { clientX: x, clientY: y } = touches[0];
      const lngLat = e.lngLat.wrap();
      pressStart = { x, y };
      pressTimer = setTimeout(() => {
        pressedAt = Date.now();
        pressStart = null;
        openMenu(x, y, lngLat);
      }, longPressMs);
    });
    // A drag or a second finger is a pan or pinch, not a press.
    m.on('touchmove', (e) => {
      const t = e.originalEvent.touches;
      if (
        pressStart &&
        (t.length !== 1 ||
          Math.hypot(t[0].clientX - pressStart.x, t[0].clientY - pressStart.y) > 10)
      ) {
        cancelPress();
      }
    });
    m.on('touchend', cancelPress);
    m.on('touchcancel', cancelPress);
    m.on('movestart', (e) => {
      // Only the user's own moves, not flying to the selected mission.
      if (e.originalEvent) cancelPress();
    });
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(container.current);
    map.current = m;
    return () => {
      clearTimeout(pressTimer);
      resize.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (styleUrl) map.current?.setStyle(styleUrl);
  }, [styleUrl]);

  useEffect(() => {
    const m = map.current;
    if (!m || styleLoads === 0) return;
    try {
      applyOverlays(m, overlayState, overlayBounds);
    } catch {
      // A new style is still loading; its style.load applies the overlays.
    }
  }, [overlayState, overlayBounds, styleLoads]);

  // Fetches an overlay's bounds once it is on, whether turned on here or
  // stored; an overlay whose bounds cannot be read is turned off again. Only
  // overlays the API lists, as a stored one may be gone.
  const listed = overlays?.enabled ? overlays.overlays : undefined;
  useEffect(() => {
    if (!listed) return;
    for (const { id } of listed) {
      if (!overlayState[id]?.on || overlayBounds[id] || boundsLoading.current.has(id)) continue;
      boundsLoading.current.add(id);
      fetchOverlayBounds(id)
        .then((b) => {
          setOverlayBounds((prev) => ({ ...prev, [id]: b }));
          setOverlayError(null);
        })
        .catch((err: Error) => {
          setOverlayError(err.message);
          const { overlayState: current, setOverlay: set } = overlayRef.current;
          set(id, { ...(current[id] ?? defaultOverlayState), on: false });
        })
        .finally(() => boundsLoading.current.delete(id));
    }
  }, [listed, overlayState, overlayBounds]);

  useEffect(() => {
    const i = initial.current;
    if (latitude === i.latitude && longitude === i.longitude && zoom === i.zoom) return;
    Object.assign(i, { latitude, longitude, zoom });
    map.current?.jumpTo({ center: [longitude, latitude], zoom });
  }, [latitude, longitude, zoom]);

  // The selected marker on top.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const placed = markers
      .toSorted((a, b) => Number(a.selected) - Number(b.selected))
      .map((mk) =>
        new Marker({
          element: markerElement(mk, () => selectRef.current(mk.id)),
          anchor: 'bottom',
        })
          .setLngLat([mk.longitude, mk.latitude])
          .addTo(m),
      );
    return () => placed.forEach((p) => p.remove());
  }, [markers]);

  // Below the mission pins (their z-index), the selected mission's on top.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const placed = units
      .toSorted((a, b) => Number(a.selected) - Number(b.selected))
      .map((u) => {
        const missionId = u.missionId;
        return new Marker({
          element: unitElement(u, missionId ? () => selectRef.current(missionId) : null),
          anchor: 'center',
        })
          .setLngLat([u.longitude, u.latitude])
          .addTo(m);
      });
    return () => placed.forEach((p) => p.remove());
  }, [units]);

  // Fly again when the selected mission, or where it is, changes.
  const target = selected ? `${selected.longitude},${selected.latitude}` : '';
  useEffect(() => {
    const m = map.current;
    if (!m || target === '') return;
    const [lng, lat] = target.split(',').map(Number);
    m.flyTo({ center: [lng, lat], zoom: Math.max(m.getZoom(), selectedZoom) });
  }, [target]);

  return (
    <div className={styles.wrapper}>
      {notice}
      {error && <Alert severity="error">{error}</Alert>}
      {unitsError && <Alert severity="warning">Units: {unitsError}</Alert>}
      {mapStyles.error && <Alert severity="error">Map styles: {mapStyles.error}</Alert>}
      {!mapStyles.loading && !mapStyles.error && mapStyles.items.length === 0 && (
        <Alert severity="warning">No map style is configured.</Alert>
      )}
      {overlaysError && <Alert severity="warning">Overlays: {overlaysError}</Alert>}
      {overlayError && (
        <Alert severity="warning" onClose={() => setOverlayError(null)}>
          Overlay: {overlayError}
        </Alert>
      )}
      <div className={styles.mapFrame}>
        <div ref={container} className={styles.map} />
        {!overlayControl && listed && listed.length > 0 && (
          <OverlaySwitcher overlays={listed} state={overlayState} onChange={setOverlay} />
        )}
      </div>
    </div>
  );
}

// The context menu is useMapActions'.
function MapWidget({ options }: WidgetProps) {
  const { selectedId, update } = useDashboard();
  const { mission } = useSelectedMission();
  const actions = useMapActions(mission, (m) => update({ selectedId: m.id }));
  const [event, setEvent] = useState('');

  return (
    <>
      <MissionMap
        options={options}
        selectedId={selectedId}
        onSelect={(id) => update({ selectedId: id })}
        notice={
          actions.error && (
            <Alert severity="error" onClose={actions.clearError}>
              {actions.error}
            </Alert>
          )
        }
        onContextMenu={actions.open}
      />
      <ContextMenu at={actions.menu?.at ?? null} onClose={actions.closeMenu} label="Map">
        <MenuItem
          onClick={() => {
            setEvent('');
            actions.startCreate();
          }}
        >
          Create New Mission Here…
        </MenuItem>
        <MenuItem
          icon={<LocationIcon />}
          disabled={!actions.canSetLocation}
          title={actions.selectedClosed ? 'The selected mission is closed' : undefined}
          onClick={() => void actions.setLocation()}
        >
          Set Location of Selected Mission
        </MenuItem>
      </ContextMenu>
      {actions.creating && (
        <ConfirmDialog
          title="New mission"
          message={
            <>
              <FieldRow id="map-new-mission-event" label="Occurred event" marked>
                <input
                  id="map-new-mission-event"
                  className="grow"
                  // Before the dialog's buttons, so it gets the focus.
                  autoFocus
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                />
              </FieldRow>
              <SectionText>
                <span className="muted">At {formatPlace(actions.creating, actions.address)}</span>
              </SectionText>
            </>
          }
          confirmLabel="Create mission"
          onConfirm={() => actions.create(event)}
          onCancel={actions.cancelCreate}
        />
      )}
    </>
  );
}

export default MapWidget;
