import { useId, useState } from 'react';
import {
  acknowledgementProgress,
  addressLine,
  awaitsAcknowledgement,
  ccReceivers,
  type Message,
  type MessageBox,
  type MessagePriority,
  maxMessageOrigin,
  maxMessageText,
  messagePath,
  receiverOf,
  toReceivers,
  useMessage,
} from '@/api/messages';
import { activeTags, type MessageTag } from '@/api/messageTags';
import { useResourceCache } from '@/api/resource';
import {
  FieldRow,
  FormActions,
  FormError,
  Section,
  SectionHeading,
  SectionText,
  sectionStack,
  WidgetForm,
} from '@/components/form';
import Spinner from '@/components/Spinner';
import { usePriorityLabels } from '@/data/messages';
import { formatTime } from '../shared/logbookEntries';
import WidgetActionBar, { WidgetAction, WidgetActionSelect } from '../shared/WidgetActionBar';
import { EmptyState } from '../shared/WidgetStates';
import tableStyles from '../shared/CatalogManager.module.scss';
import type { WidgetProps } from '../widgetOptions';
import { useWidgetState } from '../widgetState';
import { FunctionPicks, PriorityChip, TagChips, TagPicks } from './MessageParts';
import {
  boxLabels,
  type ComposeState,
  parseBox,
  tagsOf,
  useMessageActions,
  useMessageCompose,
  useMessagesView,
} from './messagesState';
import styles from './Messages.module.scss';

const parseBool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
const parseString = (v: unknown) => (typeof v === 'string' ? v : undefined);

type Shown = { kind: 'list' } | { kind: 'message'; id: string } | { kind: 'compose' };

// The chat of the session's scope: Inbox, Sent and (messages.view_all) All,
// filtered by tag and by what the session's function has yet to
// acknowledge; a row opens the message, New Message the compose form
// (messages.send). Online only. Option box is the box it starts with,
// messageId a message it opens (the menu bar's indicator and toasts).
function MessagesWidget({ options }: WidgetProps) {
  const [box, setBox] = useWidgetState<MessageBox>(
    'box',
    parseBox(options.box) ?? 'inbox',
    parseBox,
  );
  const [unack, setUnack] = useWidgetState(
    'unacknowledged',
    options.unacknowledged === true,
    parseBool,
  );
  const [tag, setTag] = useWidgetState('tag', '', parseString);
  const [shown, setShown] = useState<Shown>(() =>
    typeof options.messageId === 'string' && options.messageId
      ? { kind: 'message', id: options.messageId }
      : { kind: 'list' },
  );
  const view = useMessagesView(box, tag, unack);
  const { access, chatEnabled, list, tagsById } = view;

  if (access.offline) return <EmptyState>Messages are not available offline.</EmptyState>;
  if (chatEnabled === false) {
    return <EmptyState>The chat is disabled in this scope. Admins enable it per scope.</EmptyState>;
  }

  if (shown.kind === 'message') {
    return (
      <MessageDetail
        id={shown.id}
        tagsById={tagsById}
        allTags={view.tags.data ?? []}
        onBack={() => setShown({ kind: 'list' })}
        onChanged={() => void list.reload()}
      />
    );
  }
  if (shown.kind === 'compose') {
    return (
      <Compose
        onDone={(m) => {
          void list.reload();
          setShown(m ? { kind: 'message', id: m.id } : { kind: 'list' });
        }}
      />
    );
  }

  const messages = list.data ?? [];
  const tags = activeTags(view.tags.data);
  return (
    <div className={sectionStack}>
      <WidgetActionBar label="Messages">
        {view.boxes.map((b) => (
          <WidgetAction key={b} pressed={view.box === b} onClick={() => setBox(b)}>
            {boxLabels[b]}
          </WidgetAction>
        ))}
        <WidgetAction
          pressed={unack}
          title="Only those your function has yet to acknowledge"
          onClick={() => setUnack((v) => !v)}
        >
          Unacknowledged
        </WidgetAction>
        <WidgetActionSelect aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </WidgetActionSelect>
        <WidgetAction
          disabled={!access.send}
          title={access.send ? undefined : 'Needs the permission messages.send.'}
          onClick={() => setShown({ kind: 'compose' })}
        >
          New Message
        </WidgetAction>
      </WidgetActionBar>
      {list.data === undefined && list.error === null ? (
        <Spinner compact />
      ) : messages.length === 0 ? (
        <EmptyState className="">No messages.</EmptyState>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Priority</th>
                <th>From → To</th>
                <th>Message</th>
                <th>Sent</th>
                <th>Acknowledged</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  functionId={access.functionId}
                  tags={tagsOf(m, tagsById)}
                  onOpen={() => setShown({ kind: 'message', id: m.id })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={list.error} onClose={() => void list.reload()} />
    </div>
  );
}

function MessageRow({
  message: m,
  functionId,
  tags,
  onOpen,
}: {
  message: Message;
  functionId: string | null;
  tags: MessageTag[];
  onOpen: () => void;
}) {
  const pending = awaitsAcknowledgement(m, functionId);
  const own = receiverOf(m, functionId);
  return (
    <tr
      className={`${styles.row} ${pending ? styles.unread : ''}`}
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <td>
        <PriorityChip priority={m.priority} />
      </td>
      <td className={styles.address} title={addressLine(m)}>
        {addressLine(m)}
      </td>
      <td className={tableStyles.description}>
        <span title={m.text}>{m.text}</span>
        <TagChips tags={tags} />
      </td>
      <td className={tableStyles.meta}>{formatTime(m.created_at)}</td>
      <td>
        {own?.kind === 'to' &&
          (pending ? (
            <span className={styles.mine}>To acknowledge</span>
          ) : (
            <span className="muted">You: done</span>
          ))}
        {own?.kind === 'to' && ' · '}
        {acknowledgementProgress(m) ?? <span className="muted">All</span>}
      </td>
    </tr>
  );
}

function MessageDetail({
  id,
  tagsById,
  allTags,
  onBack,
  onChanged,
}: {
  id: string;
  tagsById: ReadonlyMap<string, MessageTag>;
  allTags: readonly MessageTag[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const cache = useResourceCache();
  const message = useMessage(id);
  const m = message.data;
  const actions = useMessageActions(m, (next) => {
    cache.put(messagePath(next.id), next);
    onChanged();
  });
  const bar = (
    <WidgetActionBar label="Message">
      <WidgetAction onClick={onBack}>Back</WidgetAction>
      {actions.canAcknowledge && (
        <WidgetAction disabled={actions.busy} onClick={actions.acknowledge}>
          Acknowledge
        </WidgetAction>
      )}
    </WidgetActionBar>
  );
  if (!m) {
    return (
      <div className={sectionStack}>
        {bar}
        {message.error ? <FormError error={message.error} onClose={onBack} /> : <Spinner compact />}
      </div>
    );
  }
  return (
    <div className={sectionStack}>
      {bar}
      <div>
        <SectionHeading>
          <PriorityChip priority={m.priority} /> {m.sender.name}
        </SectionHeading>
        <SectionText>
          <span className="muted">
            {formatTime(m.created_at)} · {m.created_by}
            {m.transmission_way && ` · via ${m.transmission_way.name}`}
            {m.origin && ` · from ${m.origin}`}
          </span>
        </SectionText>
        <p className={styles.text}>{m.text}</p>
      </div>
      <div>
        <SectionHeading>Receivers</SectionHeading>
        <table className={tableStyles.table}>
          <tbody>
            {[...toReceivers(m), ...ccReceivers(m)].map((r) => (
              <tr key={r.function.id}>
                <td>{r.kind === 'to' ? 'To' : 'CC'}</td>
                <td>{r.function.name}</td>
                <td className={tableStyles.meta}>
                  {r.kind === 'cc'
                    ? 'For information'
                    : r.acknowledged_at
                      ? `Acknowledged ${formatTime(r.acknowledged_at)} · ${r.acknowledged_by ?? ''}`
                      : 'Not acknowledged'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TagEditor
        key={m.updated_at}
        current={m.tags}
        tagsById={tagsById}
        offered={activeTags(allTags)}
        disabled={!actions.canTag || actions.busy}
        onSave={actions.setTags}
      />
      <FormError error={actions.error} onClose={actions.clearError} />
    </div>
  );
}

// The only editable part of a message. A deleted tag it has stays offered
// until removed.
function TagEditor({
  current,
  tagsById,
  offered,
  disabled,
  onSave,
}: {
  current: readonly string[];
  tagsById: ReadonlyMap<string, MessageTag>;
  offered: readonly MessageTag[];
  disabled: boolean;
  onSave: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const chosen = draft ?? [...current];
  const kept = current.flatMap((id) => {
    const t = tagsById.get(id);
    return t && t.deleted ? [t] : [];
  });
  const choices = [...offered, ...kept];
  return (
    <WidgetForm
      onSubmit={(e) => {
        e.preventDefault();
        if (draft) onSave(draft);
        setDraft(null);
      }}
    >
      <Section legend="Tags">
        {choices.length === 0 && <span className="muted">No tags yet (Message Tags).</span>}
        {choices.length > 0 && (
          <TagPicks choices={choices} picked={chosen} disabled={disabled} onChange={setDraft} />
        )}
      </Section>
      <FormActions
        submitLabel="Save Tags"
        canSubmit={draft !== null && !disabled}
        dirty={draft !== null}
        onDiscard={() => setDraft(null)}
      />
    </WidgetForm>
  );
}

function Compose({ onDone }: { onDone: (m?: Message) => void }) {
  const c = useMessageCompose((m) => onDone(m));
  return (
    <div className={sectionStack}>
      <WidgetActionBar label="New message">
        <WidgetAction onClick={() => onDone()}>Back</WidgetAction>
      </WidgetActionBar>
      <ComposeForm c={c} />
    </div>
  );
}

function ComposeForm({ c }: { c: ComposeState }) {
  const id = useId();
  const labels = usePriorityLabels();
  const all = c.receivers.data ?? [];
  const disabled = c.blocker !== null || c.busy;
  return (
    <WidgetForm
      onSubmit={(e) => {
        e.preventDefault();
        void c.send();
      }}
    >
      {c.blocker && (
        <SectionText>
          <span className="muted">{c.blocker}</span>
        </SectionText>
      )}
      <Section legend="New message">
        <FieldRow id={`${id}-to`} label="To" marked>
          <FunctionPicks
            label="To"
            picked={c.to}
            options={c.options.to}
            all={all}
            disabled={disabled}
            onChange={c.setTo}
          />
        </FieldRow>
        <FieldRow id={`${id}-cc`} label="CC">
          <FunctionPicks
            label="CC"
            picked={c.cc}
            options={c.options.cc}
            all={all}
            fixed={c.options.fixedCc}
            disabled={disabled}
            onChange={c.setCc}
          />
        </FieldRow>
        <FieldRow id={`${id}-priority`} label="Priority">
          <select
            id={`${id}-priority`}
            value={c.priority}
            disabled={disabled}
            onChange={(e) => c.setPriority(Number(e.target.value) as MessagePriority)}
          >
            {labels.map((l, i) => (
              <option key={i} value={i + 1}>
                {l}
              </option>
            ))}
          </select>
        </FieldRow>
        {c.ways.length > 0 && (
          <FieldRow id={`${id}-way`} label="Transmission">
            <select
              id={`${id}-way`}
              value={c.wayId}
              disabled={disabled}
              onChange={(e) => c.setWayId(e.target.value)}
            >
              <option value="">Chat only</option>
              {c.ways.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </FieldRow>
        )}
        <FieldRow id={`${id}-origin`} label="Origin">
          <input
            id={`${id}-origin`}
            className="grow"
            maxLength={maxMessageOrigin}
            value={c.origin}
            disabled={disabled}
            onChange={(e) => c.setOrigin(e.target.value)}
          />
        </FieldRow>
        <FieldRow id={`${id}-text`} label="Text" marked>
          <textarea
            id={`${id}-text`}
            className="grow"
            rows={5}
            maxLength={maxMessageText}
            value={c.text}
            disabled={disabled}
            required
            onChange={(e) => c.setText(e.target.value)}
          />
        </FieldRow>
        {c.tags.length > 0 && (
          <FieldRow id={`${id}-tags`} label="Tags">
            <TagPicks
              choices={c.tags}
              picked={c.tagIds}
              disabled={disabled}
              onChange={c.setTagIds}
            />
          </FieldRow>
        )}
      </Section>
      <FormActions
        submitLabel="Send"
        busy={c.busy}
        canSubmit={c.canSend}
        dirty={c.text !== '' || c.to.length > 0}
        onDiscard={c.reset}
      />
      <FormError error={c.error ?? c.receivers.error} onClose={c.clearError} />
    </WidgetForm>
  );
}

export default MessagesWidget;
