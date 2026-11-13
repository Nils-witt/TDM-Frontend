import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useId } from 'react';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { noType, useLogbookFormWidget } from '@/pages/dashboard/widgets/LogbookForm/LogbookForm.ts';
import { partyCommands } from '@/pages/dashboard/widgets/shared/logbookCommands';
import type { WidgetProps } from '@/pages/dashboard/widgets/widgetOptions';
import { FormActionBarMUI } from '../shared/ActionsMUI';
import CommandFieldMUI from '../shared/CommandFieldMUI';
import { FieldRowMUI, FormErrorMUI, FormMUI, FormSectionMUI, MutedMUI } from '../shared/FormMUI';
import FileAttachmentsMUI from './FileAttachmentsMUI';

// The LogbookForm widget in MUI, with useLogbookFormWidget's behavior: "/"
// starts a command with completion, Cmd+Enter adds the entry, files are
// uploaded with it.
function LogbookFormMUI({ options }: WidgetProps) {
  const showMission = options.showMission !== false;
  const {
    mission,
    ctx,
    parties,
    types,
    chosen,
    setTypeChoice,
    text,
    setText,
    textRef,
    sender,
    setSender,
    receiver,
    setReceiver,
    files,
    error,
    setError,
    readOnly,
    disabled,
    canAdd,
    add,
  } = useLogbookFormWidget(String(options.sender ?? ''));
  const formId = useId();

  const notice =
    mission === null ? (
      <MutedMUI>No mission selected.</MutedMUI>
    ) : (
      (showMission || readOnly) && (
        <MutedMUI>
          {showMission && mission.occurred_event}
          {showMission && readOnly && ' · '}
          {readOnly &&
            (mission.status === 'closed'
              ? 'Closed, the logbook is read-only'
              : 'Offline, the logbook is read-only')}
        </MutedMUI>
      )
    );

  return (
    <FormMUI id={formId} onSubmit={(e) => void add(e)}>
      <FormActionBarMUI label="Logbook entry" form={formId} submitLabel="Add" canSubmit={canAdd} />
      {notice}
      <FormSectionMUI legend="Entry" disabled={disabled}>
        <TextField
          select
          label="Type"
          size="small"
          value={chosen}
          disabled={disabled}
          onChange={(e) => setTypeChoice(e.target.value)}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          {types.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
          <MenuItem value={noType}>No type</MenuItem>
        </TextField>
        <FieldRowMUI>
          <CommandFieldMUI
            label="Sender"
            multiline={false}
            value={sender}
            onChange={setSender}
            ctx={ctx}
            commands={partyCommands}
            values={parties}
            placeholder="/me, /callee"
            disabled={disabled}
          />
          <CommandFieldMUI
            label="Receiver"
            multiline={false}
            value={receiver}
            onChange={setReceiver}
            ctx={ctx}
            commands={partyCommands}
            values={parties}
            placeholder="/me, /callee"
            disabled={disabled}
          />
        </FieldRowMUI>
        <CommandFieldMUI
          ref={textRef}
          label="Entry"
          rows={3}
          value={text}
          onChange={setText}
          ctx={ctx}
          placeholder="Type / for commands: /now, /callee, /me"
          disabled={disabled}
        />
      </FormSectionMUI>
      <FormSectionMUI legend="Files" disabled={disabled}>
        <FileAttachmentsMUI files={files} disabled={disabled} />
      </FormSectionMUI>
      <FormErrorMUI error={error} onClose={() => setError(null)} />
    </FormMUI>
  );
}

// Keyed by the mission so typed text does not carry over to another one.
function KeyedLogbookFormMUI(props: WidgetProps) {
  return <LogbookFormMUI key={useSelectedMission().mission?.id ?? ''} {...props} />;
}

export default KeyedLogbookFormMUI;
