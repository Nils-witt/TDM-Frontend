import { useState } from 'react';
import { ApiError } from '@/api/client';
import {
  awaitsAcknowledgement,
  chatDisabledType,
  composeOptions,
  type Message,
  type MessageBox,
  type MessagePriority,
  messagesApi,
  maxMessageOrigin,
  maxMessageText,
  useMessageReceivers,
  useMessages,
} from '@/api/messages';
import { activeTags, type MessageTag, useMessageTags } from '@/api/messageTags';
import { useTransmissionWays } from '@/api/transmissionWays';
import { useChatEnabled, useMessageAccess } from '@/data/messages';

// The state of a messages view, shared by the desktop widget and /m.

export const boxLabels: Record<MessageBox, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  all: 'All',
};

const isBox = (v: unknown): v is MessageBox => v === 'inbox' || v === 'sent' || v === 'all';
export const parseBox = (v: unknown) => (isBox(v) ? v : undefined);

export type MessagesView = ReturnType<typeof useMessagesView>;

// box/unacknowledged/tag are the caller's state (useWidgetState on the
// desktop), so the list is a pure view of it.
export function useMessagesView(box: MessageBox, tag: string, unacknowledged: boolean) {
  const access = useMessageAccess();
  const chatEnabled = useChatEnabled();
  const boxes: MessageBox[] = access.viewAll ? ['inbox', 'sent', 'all'] : ['inbox', 'sent'];
  // A box the session may no longer use (switched function) falls back.
  const shownBox = boxes.includes(box) ? box : 'inbox';
  const list = useMessages(
    access.load ? { box: shownBox, tag: tag || null, unacknowledged } : null,
  );
  const tags = useMessageTags(access.load);
  const tagsById = new Map((tags.data ?? []).map((t) => [t.id, t]));
  return { access, chatEnabled, boxes, box: shownBox, list, tags, tagsById };
}

// The tags of a message in its order, those unknown (another scope's) left
// out.
export const tagsOf = (m: Message, byId: ReadonlyMap<string, MessageTag>) =>
  m.tags.flatMap((id) => byId.get(id) ?? []);

// What is wrong with sending now, or null.
export function sendBlocker(
  access: ReturnType<typeof useMessageAccess>,
  chatEnabled: boolean | undefined,
): string | null {
  if (access.offline) return 'Messages cannot be sent offline.';
  if (!access.send) return 'Needs the permission messages.send.';
  if (chatEnabled === false) return 'The chat is disabled in this scope.';
  return null;
}

// Acknowledging and tagging one message.
export function useMessageActions(message: Message | undefined, onChanged: (m: Message) => void) {
  const access = useMessageAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<Message>) => {
    setBusy(true);
    try {
      onChanged(await fn());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canAcknowledge =
    !!message && !access.offline && awaitsAcknowledgement(message, access.functionId);
  return {
    busy,
    error,
    clearError: () => setError(null),
    canAcknowledge,
    // Tags can be changed by anyone reading the message, online.
    canTag: !!message && !access.offline,
    acknowledge: () => message && void run(() => messagesApi.acknowledge(message.id)),
    setTags: (tags: string[]) => message && void run(() => messagesApi.setTags(message, tags)),
  };
}

export type ComposeState = ReturnType<typeof useMessageCompose>;

// The compose form: To and CC from /api/v1/message-receivers, a function
// chosen in one list not offered in the other, always-CC ones as fixed CC.
export function useMessageCompose(onSent: (m: Message) => void) {
  const access = useMessageAccess();
  const chatEnabled = useChatEnabled();
  const receivers = useMessageReceivers(access.load);
  const tags = useMessageTags(access.load);
  const ways = useTransmissionWays(access.load);
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [priority, setPriority] = useState<MessagePriority>(3);
  const [text, setText] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  // '' for none.
  const [wayId, setWayId] = useState('');
  const [origin, setOrigin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = composeOptions(receivers.data ?? [], access.functionId, to, cc);
  const blocker = sendBlocker(access, chatEnabled);
  const canSend =
    blocker === null &&
    !busy &&
    to.length > 0 &&
    text.trim() !== '' &&
    text.length <= maxMessageText &&
    origin.length <= maxMessageOrigin;

  const reset = () => {
    setTo([]);
    setCc([]);
    setPriority(3);
    setText('');
    setTagIds([]);
    setWayId('');
    setOrigin('');
    setError(null);
  };

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    try {
      const m = await messagesApi.send({
        to,
        cc,
        priority,
        text: text.trim(),
        tags: tagIds,
        transmission_way: wayId || null,
        origin: origin.trim() || null,
      });
      reset();
      onSent(m);
    } catch (err) {
      setError(
        err instanceof ApiError && err.type === chatDisabledType
          ? 'The chat is disabled in this scope.'
          : (err as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    to,
    setTo,
    cc,
    setCc,
    priority,
    setPriority,
    text,
    setText,
    tagIds,
    setTagIds,
    options,
    receivers,
    tags: activeTags(tags.data),
    wayId,
    setWayId,
    origin,
    setOrigin,
    ways: ways.items.toSorted((a, b) => a.name.localeCompare(b.name)),
    blocker,
    canSend,
    busy,
    error,
    clearError: () => setError(null),
    send,
    reset,
  };
}
