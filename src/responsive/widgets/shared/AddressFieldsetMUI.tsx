import TextField from '@mui/material/TextField';
import {
  type AddressField,
  useAddressSuggest,
} from '@/pages/dashboard/widgets/shared/AddressSuggest';
import { type AddressKey, nearbySetter } from '@/pages/dashboard/widgets/shared/addressEdits';
import AddressFieldMUI from './AddressFieldMUI';
import { FieldRowMUI, FormSectionMUI } from './FormMUI';
import NearbyPlacesButtonMUI from './NearbyPlacesButtonMUI';

// The fields of an address, as the desktop's AddressFieldset.
function AddressFieldsetMUI({
  legend,
  value,
  set,
  readOnly,
}: {
  legend: string;
  value: (k: AddressKey) => string;
  set: (k: AddressKey, v: string) => void;
  readOnly: boolean;
}) {
  const suggest = useAddressSuggest(value, set, (la, lo) => {
    set('lat', la);
    set('lon', lo);
  });
  const address = (k: AddressField, label: string) => (
    <AddressFieldMUI {...suggest[k]} label={label} disabled={readOnly} />
  );

  return (
    <FormSectionMUI legend={legend} disabled={readOnly}>
      {address('object_name', 'Object')}
      <FieldRowMUI>
        {address('street', 'Street')}
        {address('house_number', 'No.')}
      </FieldRowMUI>
      <FieldRowMUI>
        {address('city', 'City')}
        {address('district', 'District')}
      </FieldRowMUI>
      <FieldRowMUI>
        {(
          [
            ['lat', 'Latitude', '50.7374'],
            ['lon', 'Longitude', '7.0982'],
          ] as const
        ).map(([k, label, example]) => (
          <TextField
            key={k}
            label={label}
            size="small"
            placeholder={example}
            value={value(k)}
            disabled={readOnly}
            onChange={(e) => set(k, e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          />
        ))}
        <NearbyPlacesButtonMUI
          lat={value('lat')}
          lon={value('lon')}
          set={nearbySetter(set)}
          disabled={readOnly}
        />
      </FieldRowMUI>
    </FormSectionMUI>
  );
}

export default AddressFieldsetMUI;
