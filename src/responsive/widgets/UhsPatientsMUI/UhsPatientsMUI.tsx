import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useState } from 'react';
import {
  formatPatientName,
  isWalkIn,
  localDate,
  type Patient,
  patientAge,
  uhsArrival,
} from '@/api/patients';
import { useNow } from '@/app/useNow';
import { MutedMUI } from '../shared/FormMUI';

const time = (ts: string) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

// The patients of an UHS as a list: name (or Unknown), age, when they
// arrived (or, inbound, were assigned), and Walk-in or their missions by
// name. With onArrive (the Inbound view) each row has an Arrived button.
function UhsPatientsMUI({
  patients,
  onOpen,
  onArrive,
  arriveDisabled = false,
}: {
  patients: readonly Patient[];
  onOpen: (p: Patient) => void;
  onArrive?: (p: Patient) => Promise<void>;
  arriveDisabled?: boolean;
}) {
  const today = localDate(new Date(useNow(60_000)));
  // The patients whose arrival is being saved, so a double tap sends one.
  const [arriving, setArriving] = useState<ReadonlySet<string>>(new Set());
  if (patients.length === 0) return <MutedMUI>No patients.</MutedMUI>;

  const arrive = (p: Patient) => {
    if (!onArrive) return;
    setArriving((s) => new Set(s).add(p.id));
    void onArrive(p).finally(() =>
      setArriving((s) => {
        const next = new Set(s);
        next.delete(p.id);
        return next;
      }),
    );
  };

  return (
    <List disablePadding>
      {patients.map((p) => {
        const age = patientAge(p.birth_date, today);
        const missions = (p.other_missions ?? []).map((m) => m.name).join(', ');
        const arrival = uhsArrival(p);
        const secondary = [
          age === null ? null : `${age} years`,
          arrival ? `arrived ${time(arrival)}` : p.uhs ? `assigned ${time(p.uhs.since)}` : null,
          isWalkIn(p) ? 'Walk-in' : missions || null,
          p.event,
        ]
          .filter(Boolean)
          .join(' · ');
        const text = (
          <ListItemText
            primary={formatPatientName(p)}
            secondary={secondary || undefined}
            slotProps={{
              primary: { color: p.first_name || p.last_name ? undefined : 'text.secondary' },
            }}
          />
        );
        if (!onArrive) {
          return (
            <ListItemButton key={p.id} divider onClick={() => onOpen(p)}>
              {text}
            </ListItemButton>
          );
        }
        return (
          <ListItem
            key={p.id}
            divider
            disablePadding
            secondaryAction={
              <Button
                variant="contained"
                size="small"
                disabled={arriveDisabled || arriving.has(p.id)}
                onClick={() => arrive(p)}
              >
                Arrived
              </Button>
            }
          >
            <ListItemButton onClick={() => onOpen(p)} sx={{ pr: 14 }}>
              {text}
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

export default UhsPatientsMUI;
