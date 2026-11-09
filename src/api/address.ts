import { useEffect, useState } from 'react';
import { ApiError, request } from './client';

// Suggestions come from the API's address directory, if it has one, and only
// help: every address field stays free text.

type StreetSuggestion = {
  name: string;
  district: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

type HouseNumberSuggestion = {
  number: string; // with its addition, e.g. "12a"
  postcode: string;
  latitude: number;
  longitude: number;
};

type DistrictSuggestion = { name: string; city: string };

export type AddressQuery = { street: string; house_number: string; city: string; district: string };

export type AddressSuggestions = {
  streets: StreetSuggestion[];
  houseNumbers: HouseNumberSuggestion[];
  cities: string[];
  districts: DistrictSuggestion[];
};

const none: AddressSuggestions = { streets: [], houseNumbers: [], cities: [], districts: [] };

const debounceMs = 250;

// Turns false once the API answers 404 (no address directory), so no more
// lookups are tried until the page reloads.
let available = true;

const addressPath = (kind: string, params: Record<string, string>) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v.trim() !== ''));
  return `/api/v1/address/${kind}?${q}`;
};

// Suggestions are optional, so failures are ignored.
async function lookup<T>(path: string, params: Record<string, string>, signal: AbortSignal) {
  try {
    return await request<T[]>(addressPath(path, params), { signal });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) available = false;
    return [] as T[];
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// Only the answer to the latest params is kept.
function useLookup<T>(path: string, params: Record<string, string> | null): T[] {
  const key = params === null ? null : JSON.stringify(params);
  const debounced = useDebounced(key, debounceMs);
  const [state, setState] = useState<{ key: string | null; items: T[] }>({ key: null, items: [] });

  useEffect(() => {
    if (debounced === null || !available) return;
    const ctl = new AbortController();
    lookup<T>(path, JSON.parse(debounced) as Record<string, string>, ctl.signal).then(
      (items) => setState({ key: debounced, items }),
      () => undefined,
    );
    return () => ctl.abort();
  }, [path, debounced]);

  // Suggestions for other text are dropped at once, not when the next
  // answer arrives.
  return state.key !== null && state.key === key ? state.items : [];
}

// Only the active field is looked up. Streets are suggested from two characters
// on; house numbers once a street is typed in.
export function useAddressSuggestions(
  q: AddressQuery,
  active: keyof AddressQuery | null,
): AddressSuggestions {
  const streets = useLookup<StreetSuggestion>(
    'streets',
    active === 'street' && q.street.trim().length >= 2
      ? { name: q.street, city: q.city, district: q.district }
      : null,
  );
  const houseNumbers = useLookup<HouseNumberSuggestion>(
    'house-numbers',
    active === 'house_number' && q.street.trim() !== ''
      ? { street: q.street, city: q.city, district: q.district }
      : null,
  );
  const cities = useLookup<string>('cities', active === 'city' ? { name: q.city } : null);
  const districts = useLookup<DistrictSuggestion>(
    'districts',
    active === 'district' ? { name: q.district, city: q.city } : null,
  );
  return active === null ? none : { streets, houseNumbers, cities, districts };
}
