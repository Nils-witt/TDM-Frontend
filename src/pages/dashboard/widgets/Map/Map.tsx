import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type RequestTransformFunction,
  setWorkerUrl,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { apiUrl, authHeaders } from '@/api/client';
import {
  fetchOverlayBounds,
  type OverlayBounds,
  overlayTilePath,
  resolveMapStyle,
  useMapStyles,
  useOverlays,
} from '@/api/maps';
import Alert from '@/components/Alert';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import type { WidgetProps } from '../widgetOptions';
import { type MapMarker, useMapMarkers } from './Map.ts';
import styles from './Map.module.scss';
import OverlaySwitcher from './OverlaySwitcher';
import { defaultOverlayState, type OverlayState } from './overlayState';

// MapLibre looks for its worker next to its own module, which Vite bundles
// away; point it at the worker file Vite serves as an asset instead.
setWorkerUrl(workerUrl);

// The least zoom the map flies to for the selected mission.
const selectedZoom = 15;

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
  el.title = m.title;
  el.setAttribute('aria-label', m.title);
  el.setAttribute('aria-pressed', String(m.selected));
  if (m.selected) el.classList.add(styles.selected);
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
    if (s.on && b) {
      if (!m.getSource(key)) {
        m.addSource(key, {
          type: 'raster',
          tiles: [absolute(apiUrl(overlayTilePath(id)))],
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

// Without overlayControl every overlay starts off and the map shows a switcher;
// with it the caller keeps the state and offers the switch elsewhere (the
// responsive UI's Settings). show-<status> off leaves those missions out,
// except the selected one.
export function MissionMap({
  options,
  selectedId,
  onSelect: select,
  overlayControl,
  onViewChange,
}: WidgetProps & {
  selectedId: string | null;
  onSelect: (id: string) => void;
  overlayControl?: OverlayControl;
  // Called after each pan or zoom (and fly to the selected mission).
  onViewChange?: (view: { latitude: number; longitude: number; zoom: number }) => void;
}) {
  const { markers, selected, error } = useMapMarkers(options, selectedId);
  const mapStyles = useMapStyles();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const { overlays, error: overlaysError } = useOverlays();
  const [ownOverlayState, setOwnOverlayState] = useState<Record<string, OverlayState>>({});
  const overlayState = overlayControl?.state ?? ownOverlayState;
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
  useEffect(() => {
    selectRef.current = select;
    viewChangeRef.current = onViewChange;
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
      attributionControl: { compact: true },
      transformRequest,
    });
    m.addControl(new NavigationControl(), 'top-right');
    m.on('style.load', () => setStyleLoads((n) => n + 1));
    m.on('moveend', () => {
      const { lng, lat } = m.getCenter();
      viewChangeRef.current?.({ latitude: lat, longitude: lng, zoom: m.getZoom() });
    });
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(container.current);
    map.current = m;
    return () => {
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
      {error && <Alert severity="error">{error}</Alert>}
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

function MapWidget({ options }: WidgetProps) {
  const { selectedId, update } = useDashboard();
  return (
    <MissionMap
      options={options}
      selectedId={selectedId}
      onSelect={(id) => update({ selectedId: id })}
    />
  );
}

export default MapWidget;
