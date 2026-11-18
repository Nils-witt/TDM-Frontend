import { FieldRow, Section, fieldWidth } from '@/components/form';
import { SuggestInput } from '@/components/SuggestInput';
import { type AddressField, useAddressSuggest } from './AddressSuggest';
import { type AddressKey, nearbySetter } from './addressEdits';
import NearbyPlacesButton from './NearbyPlacesButton';

// The fields of an address (a mission's, its destination, an UHS's). The
// values suggest from the API's address directory, if it has one.
function AddressFieldset({
  legend,
  value,
  set,
  readOnly,
  id,
}: {
  legend: string;
  value: (k: AddressKey) => string;
  set: (k: AddressKey, v: string) => void;
  readOnly: boolean;
  // The input IDs, unique in the form.
  id: (k: string) => string;
}) {
  const suggest = useAddressSuggest(value, set, (la, lo) => {
    set('lat', la);
    set('lon', lo);
  });
  const address = (k: AddressField, label: string, className = 'grow', inputId?: string) => (
    <SuggestInput
      {...suggest[k]}
      id={inputId}
      className={className}
      aria-label={inputId ? undefined : label}
    />
  );

  return (
    <Section legend={legend} disabled={readOnly}>
      <FieldRow id={id('object')} label="Object">
        {address('object_name', 'Object', 'grow', id('object'))}
      </FieldRow>
      <FieldRow id={id('street')} label="Street / No.">
        {address('street', 'Street', 'grow', id('street'))}
        {address('house_number', 'No.', fieldWidth.narrow)}
      </FieldRow>
      <FieldRow id={id('city')} label="City / District">
        {address('city', 'City', 'grow', id('city'))}
        {address('district', 'District')}
      </FieldRow>
      <FieldRow id={id('lat')} label="Lat / Lon">
        {(
          [
            ['lat', 'Latitude', '50.7374'],
            ['lon', 'Longitude', '7.0982'],
          ] as const
        ).map(([k, label, example]) => (
          <input
            key={k}
            id={k === 'lat' ? id('lat') : undefined}
            className="grow"
            aria-label={k === 'lat' ? undefined : label}
            inputMode="decimal"
            placeholder={example}
            value={value(k)}
            onChange={(e) => set(k, e.target.value)}
          />
        ))}
        <NearbyPlacesButton
          lat={value('lat')}
          lon={value('lon')}
          set={nearbySetter(set)}
          disabled={readOnly}
        />
      </FieldRow>
    </Section>
  );
}

export default AddressFieldset;
