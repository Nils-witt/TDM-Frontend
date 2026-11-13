import { fmsStatusLabels, unitLabel } from '@/api/units';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SectionText } from '@/components/form';
import type { UnitRequestRow } from './unitRequests';

type Props = {
  row: UnitRequestRow;
  onAcknowledge: (row: UnitRequestRow) => unknown;
  onClose: () => void;
};

// Asks before acknowledging, as a click alone is easily made by mistake. The
// caller shows a failure itself (useUnitRequests' error), so the dialog
// closes right away.
function AcknowledgeRequestDialog({ row, onAcknowledge, onClose }: Props) {
  const { code } = row.request;
  return (
    <ConfirmDialog
      title="Acknowledge request"
      message={
        <SectionText>
          Acknowledge the request {code}
          {fmsStatusLabels[code] && ` (${fmsStatusLabels[code]})`} of {unitLabel(row.unit)}?
        </SectionText>
      }
      confirmLabel="Acknowledge"
      onConfirm={async () => {
        onClose();
        onAcknowledge(row);
      }}
      onCancel={onClose}
    />
  );
}

export default AcknowledgeRequestDialog;
