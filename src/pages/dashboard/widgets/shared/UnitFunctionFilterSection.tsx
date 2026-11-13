import { useId } from 'react';
import { compactControls, FieldRow, Section } from '@/components/form';
import UnitFunctionFilterInput from './UnitFunctionFilterInput';

// The Filter section of the unit widgets, as the Logbook's.
function UnitFunctionFilterSection(props: {
  functions: readonly string[];
  filter: ReadonlySet<string>;
  onChange: (filter: ReadonlySet<string>) => void;
}) {
  const id = useId();
  return (
    <Section legend="Filter" className={compactControls}>
      <FieldRow id={id} label="Function">
        <UnitFunctionFilterInput id={id} {...props} />
      </FieldRow>
    </Section>
  );
}

export default UnitFunctionFilterSection;
