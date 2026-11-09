import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Fragment, memo } from 'react';
import type { LogEntry, LogFile } from '@/api/logbook';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { useLogbookWidget } from '@/pages/dashboard/widgets/Logbook/Logbook.ts';
import { formatParties, formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import {
  type DefaultFilters,
  defaultFilters,
  filtersKey,
} from '@/pages/dashboard/widgets/shared/logbookFilterOptions';
import type { WidgetProps } from '@/pages/dashboard/widgets/widgetOptions';
import { ActionMUI, ActionsMUI } from '../shared/ActionsMUI';
import { RevokeDialogMUI } from '../shared/DialogsMUI';
import { TypeFilterMUI, PartyFilterMUI } from '../shared/FiltersMUI';
import { FieldRowMUI, FormErrorMUI, FormSectionMUI, MutedMUI } from '../shared/FormMUI';
import LogFileListMUI from '../shared/LogFileListMUI';
import { LogbookTypeBadgeMUI } from '../shared/TypeBadgeMUI';

// The Logbook widget in MUI, with useLogbookWidget's behavior. A touch screen
// has no context menu, so each entry shows its Revoke button.
function MissionLogbookMUI({
  showCreate,
  defaults,
}: {
  showCreate: boolean;
  defaults: DefaultFilters;
}) {
  const {
    mission,
    entries,
    loading,
    shown,
    files,
    error,
    setError,
    readOnly,
    revoke,
    revokeSubject,
    confirmRevoke,
    cancelRevoke,
    openForm,
    filter,
    setFilter,
    typeFilter,
    setTypeFilter,
    showFilters,
    toggleFilters,
    activeFilters,
  } = useLogbookWidget(defaults);

  return (
    <Stack sx={{ gap: 2 }}>
      {(showCreate || mission !== null) && (
        <ActionsMUI label="Logbook">
          {showCreate && (
            <ActionMUI disabled={mission === null || readOnly} onClick={openForm}>
              Create
            </ActionMUI>
          )}
          {mission !== null && (
            <ActionMUI
              pressed={showFilters}
              title={showFilters ? 'Hide filters' : 'Show filters'}
              onClick={toggleFilters}
            >
              Filters{activeFilters > 0 && ` (${activeFilters})`}
            </ActionMUI>
          )}
        </ActionsMUI>
      )}
      {mission !== null && showFilters && (
        <FormSectionMUI legend="Filter">
          <TypeFilterMUI entries={entries} filter={typeFilter} onChange={setTypeFilter} />
          <FieldRowMUI>
            <PartyFilterMUI filter={filter} onChange={setFilter} />
          </FieldRowMUI>
        </FormSectionMUI>
      )}
      {mission === null && <MutedMUI>No mission selected.</MutedMUI>}
      {mission !== null &&
        !loading &&
        (shown.length === 0 ? (
          <MutedMUI>{entries.length === 0 ? 'No entries yet.' : 'No matching entries.'}</MutedMUI>
        ) : (
          <Stack component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {shown.map((e, i) => (
              <Fragment key={e.id}>
                {i > 0 && <Divider component="li" aria-hidden />}
                <EntryItemMUI
                  entry={e}
                  files={files(e.id)}
                  canRevoke={!readOnly}
                  onRevoke={revoke}
                  onError={setError}
                />
              </Fragment>
            ))}
          </Stack>
        ))}
      <FormErrorMUI error={error} onClose={() => setError(null)} />
      {revokeSubject !== null && (
        <RevokeDialogMUI subject={revokeSubject} onRevoke={confirmRevoke} onCancel={cancelRevoke} />
      )}
    </Stack>
  );
}

type EntryItemProps = {
  entry: LogEntry;
  files: readonly LogFile[];
  canRevoke: boolean;
  onRevoke: (entry: LogEntry) => void;
  onError: (error: string) => void;
};

// Memoized: filtering the logbook renders only the entries newly shown.
const EntryItemMUI = memo(function EntryItemMUI({
  entry: e,
  files,
  canRevoke,
  onRevoke,
  onError,
}: EntryItemProps) {
  const created = [formatParties(e), e.created_by].filter((part) => part !== '').join(' · ');
  return (
    <Stack component="li" sx={{ py: 1.5, gap: 0.75 }}>
      <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.text}</Typography>
      {files.length > 0 && <LogFileListMUI files={files} onError={onError} />}
      <Stack direction="row" useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography component="span" variant="body2" color="text.secondary">
          {formatTime(e.created_at)}
        </Typography>
        <LogbookTypeBadgeMUI typeId={e.type_id} />
        {created && (
          <Typography component="span" variant="body2" color="text.secondary">
            {created}
          </Typography>
        )}
        {canRevoke && (
          <Button
            size="small"
            color="error"
            startIcon={<SymbolIcon name="block" />}
            onClick={() => onRevoke(e)}
            sx={{ ml: 'auto' }}
          >
            Revoke…
          </Button>
        )}
      </Stack>
    </Stack>
  );
});

// As LogbookWidget: keyed by the mission so the filters reset for another one,
// and by the default filters, so changing them applies them.
function LogbookMUI({ options }: WidgetProps) {
  const { mission } = useSelectedMission();
  const defaults = defaultFilters(options);
  return (
    <MissionLogbookMUI
      key={`${mission?.id ?? ''} ${filtersKey(defaults)}`}
      showCreate={options.showCreate !== false}
      defaults={defaults}
    />
  );
}

export default LogbookMUI;
