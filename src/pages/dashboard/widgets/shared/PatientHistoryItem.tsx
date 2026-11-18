import type { Patient } from '@/api/patients';
import MenuItem from '@/components/menu/MenuItem';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';

// The menu item that opens the patient's missions and UHS stays in a window;
// also the whole row menu where a patient is only picked (Link Patient).
function PatientHistoryItem({ patient }: { patient: Patient }) {
  const { openWidget } = useWidgetWindows();
  return (
    <MenuItem onClick={() => openWidget('PatientHistory', { patientId: patient.id })}>
      History
    </MenuItem>
  );
}

export default PatientHistoryItem;
