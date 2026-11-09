import { reportPdfPath } from '@/api/reports';
import { WidgetForm } from '@/components/form';
import {
  useCloseWidgetWindow,
  useWidgetWindows,
} from '@/components/widgetWindow/widgetWindowContext';
import { useMissions } from '@/data/missionsContext';
import { CreateReportFields } from '../Reports/CreateReportForm';
import { useCreateReport } from '../Reports/useCreateReport';
import type { WidgetProps } from '../widgetOptions';

// Opened by Missions → Create Report for the mission selected then; the
// mission cannot be changed here, so a later selection does not move it.
// Once created, the PDF opens and this window closes.
function CreateReportWidget({ options }: WidgetProps) {
  const missionId = String(options.missionId) || null;
  const missions = useMissions();
  const { openWidget } = useWidgetWindows();
  const closeWindow = useCloseWidgetWindow();
  const state = useCreateReport({
    missions: missions.items,
    missionId,
    locked: true,
    onCreated: (r) => {
      const event = missions.byId.get(r.mission)?.occurred_event ?? r.mission;
      openWidget('PdfViewer', { path: reportPdfPath(r.id), name: `${event}.pdf` });
      closeWindow?.();
    },
  });

  return (
    <WidgetForm
      onSubmit={(e) => {
        e.preventDefault();
        void state.submit();
      }}
    >
      <CreateReportFields state={state} onClose={closeWindow ?? undefined} />
    </WidgetForm>
  );
}

export default CreateReportWidget;
