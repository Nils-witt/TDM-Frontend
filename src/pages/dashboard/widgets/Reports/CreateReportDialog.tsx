import type { Mission } from '@/api/missions';
import type { Report } from '@/api/reports';
import { CreateReportFields } from './CreateReportForm';
import { useCreateReport } from './useCreateReport';
import { ReportDialog } from './ReportDialog';

type Props = {
  missions: readonly Mission[];
  // Picked first if finished: the one the dashboard selected, say.
  missionId: string | null;
  onCreated: (r: Report) => void;
  onClose: () => void;
};

// Of a done or closed mission; the API generates the PDF.
function CreateReportDialog({ missions, missionId, onCreated, onClose }: Props) {
  const state = useCreateReport({ missions, missionId, onCreated });
  return (
    <ReportDialog
      title="Create report"
      busy={state.busy}
      onSubmit={() => void state.submit()}
      onClose={onClose}
    >
      <CreateReportFields state={state} onClose={onClose} />
    </ReportDialog>
  );
}

export default CreateReportDialog;
