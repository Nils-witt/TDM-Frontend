import { useState } from 'react';
import type { Coordinates } from '@/api/missions';
import type { AddressField } from './AddressSuggest';

// The fields of an address as the API names them after a prefix
// (address_street, destination_city, …): the mission's address, its
// destination and an UHS's address.
export type AddressPrefix = 'address_' | 'destination_';

// An address as edited: its text fields, and its coordinates as text, parsed
// on save.
export type AddressKey = AddressField | 'lat' | 'lon';
export type AddressValues = Record<AddressKey, string>;

const textKeys: readonly AddressField[] = [
  'street',
  'house_number',
  'city',
  'district',
  'object_name',
];
const keys: readonly AddressKey[] = [...textKeys, 'lat', 'lon'];

const coordText = (v: number | undefined) => (v === undefined ? '' : String(v));

// The address of o under prefix; missing fields are blank.
export function addressValues(o: object | null | undefined, prefix: AddressPrefix): AddressValues {
  const r = (o ?? {}) as Record<string, unknown>;
  const text = (k: AddressField) => {
    const v = r[`${prefix}${k}`];
    return typeof v === 'string' ? v : '';
  };
  const c = r[`${prefix}coordinates`] as Coordinates | null | undefined;
  return {
    street: text('street'),
    house_number: text('house_number'),
    city: text('city'),
    district: text('district'),
    object_name: text('object_name'),
    lat: coordText(c?.lat),
    lon: coordText(c?.lon),
  };
}

// Blank is null (unknown); range checks are left to the API.
function parseCoord(text: string, label: string): number | null {
  if (text.trim() === '') return null;
  const v = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(v)) throw new Error(`${label} must be a number`);
  return v;
}

// The fields of edited that differ from stored, named after prefix, for a
// PATCH; the coordinates as one field, both or neither set. Throws for
// coordinates that are no numbers.
export function addressChanges(
  stored: AddressValues,
  edited: AddressValues,
  prefix: AddressPrefix,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const k of textKeys) {
    if (edited[k] !== stored[k]) body[`${prefix}${k}`] = edited[k];
  }
  if (edited.lat !== stored.lat || edited.lon !== stored.lon) {
    const lat = parseCoord(edited.lat, 'Latitude');
    const lon = parseCoord(edited.lon, 'Longitude');
    if ((lat === null) !== (lon === null)) {
      throw new Error('Latitude and longitude must be set together');
    }
    body[`${prefix}coordinates`] = lat === null || lon === null ? null : { lat, lon };
  }
  return body;
}

// What is typed over stored; every other field shows stored, so changes
// saved elsewhere show up.
export function useAddressEdits(stored: AddressValues) {
  const [edits, setEdits] = useState<Partial<AddressValues>>({});
  const value = (k: AddressKey) => edits[k] ?? stored[k];
  const values = Object.fromEntries(keys.map((k) => [k, value(k)])) as AddressValues;
  return {
    value,
    values,
    set: (k: AddressKey, v: string) => setEdits((e) => ({ ...e, [k]: v })),
    dirty: keys.some((k) => value(k) !== stored[k]),
    // Drops the edits sent, unless they changed again meanwhile.
    saved: (sent: AddressValues) =>
      setEdits((e) => {
        const next = { ...e };
        for (const k of keys) if (next[k] === sent[k]) delete next[k];
        return next;
      }),
    reset: () => setEdits({}),
  };
}

// The set of the nearby places, which write the address_* keys.
export const nearbySetter =
  (set: (k: AddressKey, v: string) => void) =>
  (k: string, v: string): void => {
    if (k.startsWith('address_')) set(k.slice('address_'.length) as AddressField, v);
  };
