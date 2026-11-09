import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type RequestTransformFunction,
  setWorkerUrl,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { WidgetProps } from '../widgetOptions';
import { type MapMarker, useMapWidget } from './Map.ts';
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

// Every overlay starts off. show-<status> off leaves those missions out, except
// the selected one.
function MapWidget({ options }: WidgetProps) {
  const { markers, selected, select, error } = useMapWidget(options);
  const mapStyles = useMapStyles();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const { overlays, error: overlaysError } = useOverlays();
  const [overlayState, setOverlayState] = useState<Record<string, OverlayState>>({});
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
  useEffect(() => {
    selectRef.current = select;
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

  // Fetches the overlay's bounds the first time it is turned on; an overlay
  // whose bounds cannot be read is turned off again.
  const changeOverlay = useCallback(
    (id: string, s: OverlayState) => {
      setOverlayState((prev) => ({ ...prev, [id]: s }));
      if (!s.on || overlayBounds[id] || boundsLoading.current.has(id)) return;
      boundsLoading.current.add(id);
      fetchOverlayBounds(id)
        .then((b) => {
          setOverlayBounds((prev) => ({ ...prev, [id]: b }));
          setOverlayError(null);
        })
        .catch((err: Error) => {
          setOverlayError(err.message);
          setOverlayState((prev) => ({
            ...prev,
            [id]: { ...(prev[id] ?? defaultOverlayState), on: false },
          }));
        })
        .finally(() => boundsLoading.current.delete(id));
    },
    [overlayBounds],
  );

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
        {overlays?.enabled && overlays.overlays.length > 0 && (
          <OverlaySwitcher
            overlays={overlays.overlays}
            state={overlayState}
            onChange={changeOverlay}
          />
        )}
      </div>
    </div>
  );
}

export default MapWidget;
