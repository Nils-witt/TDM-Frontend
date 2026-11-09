import { useCollection } from './collection';
import { request } from './client';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';
import { useResource } from './resource';

// A basemap: url is a MapLibre style JSON, an absolute https URL the browser
// loads itself, without the token. Names are unique; at most one style is the
// default.
export type MapStyle = EntityMeta & {
  id: string;
  name: string;
  url: string;
  is_default: boolean;
};

export const mapStylesPath = '/api/v1/map-styles';

const fetchMapStyles = listFetcher<MapStyle>('map_styles');

// Shared through the resource cache, so the admin widget's reload after a
// write updates every map.
export const useMapStyles = () => useCollection(mapStylesPath, fetchMapStyles);

// Map widgets name their style by ID; an empty or deleted ID resolves to the
// default style, else the first. undefined only without styles.
export function resolveMapStyle(styles: readonly MapStyle[], id: string): MapStyle | undefined {
  return (
    styles.find((s) => id !== '' && s.id === id) ?? styles.find((s) => s.is_default) ?? styles[0]
  );
}

export type MapStyleInput = { name: string; url: string; is_default?: boolean };

// The writes need the admin group. Making a style the default clears the
// previous one.
export const mapStylesApi = {
  create: (input: MapStyleInput) =>
    request<MapStyle>(mapStylesPath, { method: 'POST', body: JSON.stringify(input) }),
  patch: (id: string, input: Partial<MapStyleInput>) =>
    request<MapStyle>(`${mapStylesPath}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<void>(`${mapStylesPath}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

// A map of the API's tile server, drawn over the basemap. The API proxies it,
// so the tile server's token stays there.
export type Overlay = { id: string; name: string; description: string };

// enabled is false, and the list empty, without a tile server.
export type Overlays = { enabled: boolean; overlays: Overlay[] };

export type OverlayBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
  min_zoom: number;
  max_zoom: number;
};

const overlaysPath = '/api/v1/overlays';

// Read from the tile server once per page load.
export function useOverlays() {
  const { data, error } = useResource<Overlays>(overlaysPath);
  return { overlays: data, error };
}

// MapLibre requests it itself; Map's transformRequest adds the token.
export const overlayTilePath = (id: string) =>
  `${overlaysPath}/${encodeURIComponent(id)}/tiles/{z}/{x}/{y}`;

export const fetchOverlayBounds = (id: string) =>
  request<OverlayBounds>(`${overlaysPath}/${encodeURIComponent(id)}/bounds`);
