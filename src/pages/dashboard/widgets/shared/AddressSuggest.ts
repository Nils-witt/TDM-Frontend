import { useState } from 'react';
import { type AddressQuery, useAddressSuggestions } from '@/api/address';
import type { Suggestion } from '@/components/SuggestInput';

export type AddressField = keyof AddressQuery;

const maxShown = 50;

const coordText = (v: number) => String(v);

// Picking a suggestion fills in what it knows: an object its whole address and
// position, a street its city, district and position, a house number its
// position, a district its city. Everything stays editable as text.
export function useAddressSuggest(
  value: (k: AddressField) => string,
  set: (k: AddressField, v: string) => void,
  setPosition: (latitude: string, longitude: string) => void,
) {
  const [active, setActive] = useState<AddressField | null>(null);
  const q: AddressQuery = {
    object_name: value('object_name'),
    street: value('street'),
    house_number: value('house_number'),
    city: value('city'),
    district: value('district'),
  };
  const found = useAddressSuggestions(q, active);

  // Empty values keep what is there.
  const fill = (vals: Partial<Record<AddressField, string>>) => {
    for (const [k, v] of Object.entries(vals) as [AddressField, string][]) {
      if (v.trim() !== '' && v !== value(k)) set(k, v);
    }
  };

  const streets: Suggestion[] = found.streets.slice(0, maxShown).map((s) => ({
    key: `${s.name}|${s.district}|${s.city}|${s.country}`,
    value: s.name,
    detail: [s.district, s.city].filter(Boolean).join(', '),
    onPick: () => {
      fill({ city: s.city, district: s.district });
      setPosition(coordText(s.latitude), coordText(s.longitude));
    },
  }));

  const typedNumber = q.house_number.trim().toLowerCase();
  const houseNumbers: Suggestion[] = found.houseNumbers
    .filter((n) => n.number.toLowerCase().startsWith(typedNumber))
    .slice(0, maxShown)
    .map((n) => ({
      key: n.number,
      value: n.number,
      detail: n.postcode,
      onPick: () => setPosition(coordText(n.latitude), coordText(n.longitude)),
    }));

  const cities: Suggestion[] = found.cities.slice(0, maxShown).map((c) => ({ key: c, value: c }));

  const districts: Suggestion[] = found.districts.slice(0, maxShown).map((d) => ({
    key: `${d.name}|${d.city}`,
    value: d.name,
    detail: d.city,
    onPick: () => fill({ city: d.city }),
  }));

  // An object's address replaces the typed one, as its parts belong
  // together; a number left from another address would be wrong.
  const objects: Suggestion[] = found.objects.slice(0, maxShown).map((o) => ({
    key: `${o.name}|${o.group}|${o.latitude}|${o.longitude}`,
    value: o.name,
    detail: [o.group, [o.street, o.house_number].filter(Boolean).join(' '), o.city]
      .filter(Boolean)
      .join(' · '),
    onPick: () => {
      const address = {
        street: o.street,
        house_number: o.house_number,
        city: o.city,
        district: o.district,
      };
      for (const [k, v] of Object.entries(address) as [AddressField, string][]) {
        if (v !== value(k)) set(k, v);
      }
      setPosition(coordText(o.latitude), coordText(o.longitude));
    },
  }));

  const props = (k: AddressField, suggestions: Suggestion[]) => ({
    value: value(k),
    onChange: (v: string) => set(k, v),
    onActive: (on: boolean) => setActive((cur) => (on ? k : cur === k ? null : cur)),
    suggestions,
  });

  return {
    object_name: props('object_name', objects),
    street: props('street', streets),
    house_number: props('house_number', houseNumbers),
    city: props('city', cities),
    district: props('district', districts),
  };
}
