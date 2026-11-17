import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { formatPatientName, isWalkIn, localDate, type Patient, patientAge } from '@/api/patients';
import { useNow } from '@/app/useNow';
import { MutedMUI } from '../shared/FormMUI';

const time = (ts: string) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

// The patients of an UHS as a list: name (or Unknown), age, since when, and
// Walk-in or their missions by name.
function UhsPatientsMUI({
  patients,
  onOpen,
}: {
  patients: readonly Patient[];
  onOpen: (p: Patient) => void;
}) {
  const today = localDate(new Date(useNow(60_000)));
  if (patients.length === 0) return <MutedMUI>No patients.</MutedMUI>;
  return (
    <List disablePadding>
      {patients.map((p) => {
        const age = patientAge(p.birth_date, today);
        const missions = (p.other_missions ?? []).map((m) => m.name).join(', ');
        const secondary = [
          age === null ? null : `${age} years`,
          p.uhs ? `since ${time(p.uhs.since)}` : null,
          isWalkIn(p) ? 'Walk-in' : missions || null,
          p.event,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <ListItemButton key={p.id} divider onClick={() => onOpen(p)}>
            <ListItemText
              primary={formatPatientName(p)}
              secondary={secondary || undefined}
              slotProps={{
                primary: { color: p.first_name || p.last_name ? undefined : 'text.secondary' },
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}

export default UhsPatientsMUI;
