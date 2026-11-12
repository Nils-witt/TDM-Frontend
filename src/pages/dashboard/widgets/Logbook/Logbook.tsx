import { memo, useId } from 'react';
import type { LogEntry, LogFile } from '@/api/logbook';
import { compactControls, FieldRow, FormError, Section } from '@/components/form';
import { BlockIcon } from '@/components/icons';
import ContextMenu from '@/components/menu/ContextMenu';
import MenuItem from '@/components/menu/MenuItem';
import { useContextMenu } from '@/components/menu/useContextMenu';
import RevokeDialog from '@/components/RevokeDialog';
import { useSelectedMission } from '@/data/selectedMissionContext';
import FilterToggle from '../shared/FilterToggle';
import { formatParties, formatTime } from '../shared/logbookEntries';
import { type DefaultFilters, defaultFilters, filtersKey } from '../shared/logbookFilterOptions';
import { LogbookTypeBadge } from '../shared/LogbookTypeBadge';
import LogFileList from '../shared/LogFileList';
import PartyFilterInputs from '../shared/PartyFilterInputs';
import TypeFilterInput from '../shared/TypeFilterInput';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState, NoMission } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import { useLogbookWidget } from './Logbook.ts';

// Entries are added in the LogbookForm widget, opened in a window by the Create
// action (shown if showCreate is set), and revoked here unless the mission is
// closed. The filters are hidden until the Filters action shows them.
function MissionLogbook({
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
  const typeId = useId();
  const partyId = useId();

  return (
    <>
      {(showCreate || mission !== null) && (
        <WidgetActionBar label="Logbook">
          {showCreate && (
            <WidgetAction disabled={mission === null || readOnly} onClick={openForm}>
              Create
            </WidgetAction>
          )}
          {mission !== null && (
            <FilterToggle open={showFilters} active={activeFilters} onToggle={toggleFilters} />
          )}
        </WidgetActionBar>
      )}
      {mission !== null && showFilters && (
        <Section legend="Filter" className={compactControls}>
          <FieldRow id={typeId} label="Type">
            <TypeFilterInput
              id={typeId}
              entries={entries}
              filter={typeFilter}
              onChange={setTypeFilter}
            />
          </FieldRow>
          <FieldRow id={partyId} label="Sender / Receiver">
            <PartyFilterInputs id={partyId} filter={filter} onChange={setFilter} />
          </FieldRow>
        </Section>
      )}
      {mission === null && <NoMission className="mt" />}
      {mission !== null &&
        !loading &&
        (shown.length === 0 ? (
          <EmptyState>
            {entries.length === 0 ? 'No entries yet.' : 'No matching entries.'}
          </EmptyState>
        ) : (
          <ul className="list log">
            {shown.map((e) => (
              <EntryItem
                key={e.id}
                entry={e}
                files={files(e.id)}
                canRevoke={!readOnly}
                onRevoke={revoke}
                onError={setError}
              />
            ))}
          </ul>
        ))}
      <FormError error={error} onClose={() => setError(null)} />
      {revokeSubject !== null && (
        <RevokeDialog subject={revokeSubject} onRevoke={confirmRevoke} onCancel={cancelRevoke} />
      )}
    </>
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
const EntryItem = memo(function EntryItem({
  entry: e,
  files,
  canRevoke,
  onRevoke,
  onError,
}: EntryItemProps) {
  const menu = useContextMenu();
  const created = [formatParties(e), e.created_by].filter((part) => part !== '').join(' · ');
  return (
    <li
      // Focusable so the context-menu key and Shift+F10 open the menu too.
      tabIndex={canRevoke ? 0 : undefined}
      onContextMenu={canRevoke ? menu.onContextMenu : undefined}
    >
      <div className="content">
        <p className="primary pre">{e.text}</p>
        {files.length > 0 && <LogFileList files={files} canPin={canRevoke} onError={onError} />}
        <p className="secondary">
          {formatTime(e.created_at)} · <LogbookTypeBadge typeId={e.type_id} /> · {created}
        </p>
      </div>
      {canRevoke && (
        <ContextMenu at={menu.at} onClose={menu.close} label="Log entry">
          <MenuItem icon={<BlockIcon />} onClick={() => onRevoke(e)}>
            Revoke…
          </MenuItem>
        </ContextMenu>
      )}
    </li>
  );
});

// showCreate shows the action opening LogbookForm; the filter options set the
// filters it starts with.
function LogbookWidget({ options }: WidgetProps) {
  const { mission } = useSelectedMission();
  const defaults = defaultFilters(options);
  // Keyed by the mission so the filters reset for another one, and by the
  // default filters, so changing them applies them.
  return (
    <MissionLogbook
      key={`${mission?.id ?? ''} ${filtersKey(defaults)}`}
      showCreate={options.showCreate !== false}
      defaults={defaults}
    />
  );
}

export default LogbookWidget;
