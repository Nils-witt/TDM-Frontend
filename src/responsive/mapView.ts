// Where the Map page was last left, so it opens there again (also after a
// reload). Kept in this browser only, like the overlay settings.
const key = 'universam.mapView';

export type MapView = { latitude: number; longitude: number; zoom: number };

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function readMapView(): MapView | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<MapView> | null;
    if (v && finite(v.latitude) && finite(v.longitude) && finite(v.zoom)) {
      return { latitude: v.latitude, longitude: v.longitude, zoom: v.zoom };
    }
  } catch {
    // Unreadable or no storage: the default view.
  }
  return null;
}

export function saveMapView(view: MapView) {
  try {
    localStorage.setItem(key, JSON.stringify(view));
  } catch {
    // Without storage the map opens on the default view.
  }
}
