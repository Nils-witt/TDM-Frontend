import { useId } from 'react';
import { FieldRow, FormActions, FormError, Section, WidgetForm } from '@/components/form';
import { useSelectedMission } from '@/data/selectedMissionContext';
import CommandField from '../shared/CommandField';
import { partyCommands } from '../shared/logbookCommands';
import { NoMission } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import FileAttachments from './FileAttachments';
import { noType, useLogbookFormWidget } from './LogbookForm.ts';
import styles from './LogbookForm.module.scss';

// In the entry field Enter starts a new line and Cmd+Enter adds the entry; "/"
// starts a command with completion (see logbookCommands). Sender and receiver
// complete /me and /callee and the senders and receivers already in the
// logbook. Files are uploaded with the entry.
function LogbookFormWidget({ options }: WidgetProps) {
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
  } = useLogbookFormWidget();

  const id = useId();
  const notice =
    mission === null ? (
      <NoMission />
    ) : (
      (showMission || readOnly) && (
        <p className="muted">
          {showMission && mission.occurred_event}
          {showMission && readOnly && ' · '}
          {readOnly && 'Closed, the logbook is read-only'}
        </p>
      )
    );

  return (
    <WidgetForm onSubmit={(e) => void add(e)}>
      <Section legend="Entry" disabled={disabled}>
        <FieldRow id={`${id}-type`} label="Type">
          <select
            id={`${id}-type`}
            className="grow"
            value={chosen}
            onChange={(e) => setTypeChoice(e.target.value)}
            disabled={disabled}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value={noType}>No type</option>
          </select>
        </FieldRow>
        <FieldRow id={`${id}-sender`} label="Sender / Receiver">
          <CommandField
            id={`${id}-sender`}
            multiline={false}
            className="grow"
            value={sender}
            onChange={setSender}
            ctx={ctx}
            commands={partyCommands}
            values={parties}
            placeholder="Sender (/me, /callee)"
            aria-label="Sender"
            disabled={disabled}
          />
          <CommandField
            multiline={false}
            className="grow"
            value={receiver}
            onChange={setReceiver}
            ctx={ctx}
            commands={partyCommands}
            values={parties}
            placeholder="Receiver (/me, /callee)"
            aria-label="Receiver"
            disabled={disabled}
          />
        </FieldRow>
        <CommandField
          ref={textRef}
          className={styles.entry}
          rows={3}
          value={text}
          onChange={setText}
          ctx={ctx}
          placeholder="Entry (type / for commands: /now, /callee, /me)"
          aria-label="Entry"
          disabled={disabled}
        />
      </Section>
      <Section legend="Files" disabled={disabled}>
        <FileAttachments files={files} disabled={disabled} />
      </Section>
      <FormActions submitLabel="Add" canSubmit={canAdd} aside={notice} />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

// Keyed by the mission so typed text does not carry over to another one.
function KeyedLogbookFormWidget(props: WidgetProps) {
  return <LogbookFormWidget key={useSelectedMission().mission?.id ?? ''} {...props} />;
}

export default KeyedLogbookFormWidget;
