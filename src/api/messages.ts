import { request } from './client';
import type { EntityMeta, Timestamp } from './entity';
import { listFetcher } from './list';
import { useResource } from './resource';

// The in-application chat: messages written within the session's mission
// scope from its user function to one or more functions (To, which
// acknowledge it) and any CC functions (for information). Text, sender,
// receivers and priority never change, only the tags. Online only, like
// patients: kept out of the offline store (persist: false).
// messages.view reads what the session's function sent or receives,
// messages.send writes, messages.view_all reads every message of the scope.

export type MessageFunction = { id: string; name: string };

export type MessageReceiverKind = 'to' | 'cc';

export type MessageReceiver = {
  kind: MessageReceiverKind;
  // The function's name when the message was sent.
  function: MessageFunction;
  // Set once a To receiver acknowledged; null until then and for CC.
  acknowledged_at: Timestamp | null;
  acknowledged_by: string | null;
};

export type MessagePriority = 1 | 2 | 3 | 4;

export type Message = EntityMeta & {
  id: string;
  // null for Default.
  scope: string | null;
  // The sender's session function (id `all` for All permissions); the
  // sending user is created_by.
  sender: MessageFunction;
  // 1 (I, highest) to 4 (IV); labels in api/messageSettings.ts.
  priority: MessagePriority;
  text: string;
  // Tag IDs (api/messageTags.ts), which may have been deleted since.
  tags: string[];
  // How it was transmitted besides the chat (api/transmissionWays.ts), its
  // name kept after the way is deleted; null for none, absent from an API
  // older than transmission ways.
  transmission_way?: { id: string; name: string } | null;
  // Free text naming where the message came from (a unit, a caller, …);
  // null for none, absent from an API older than the field.
  origin?: string | null;
  // To before CC, each by name.
  receivers: MessageReceiver[];
  acknowledged: boolean;
  acknowledgements: { acknowledged: number; total: number };
};

export type MessageBox = 'inbox' | 'sent' | 'all';

export type MessageQuery = {
  box: MessageBox;
  tag?: string | null;
  // Only those the session's function has yet to acknowledge as To.
  unacknowledged?: boolean;
};

export type MessageDraft = {
  to: string[];
  cc: string[];
  priority: MessagePriority;
  text: string;
  tags: string[];
  // A transmission way's ID, or null for none.
  transmission_way: string | null;
  // null for none.
  origin: string | null;
};

// A function messages can be addressed to.
export type MessageReceiverOption = { id: string; name: string; always_cc: boolean };

export const messagesPath = '/api/v1/messages';
export const messageReceiversPath = '/api/v1/message-receivers';
export const messagePath = (id: string) => `${messagesPath}/${encodeURIComponent(id)}`;

export const maxMessageText = 4000;
export const maxMessageOrigin = 200;

// The problem type of a send refused because the chat is off in the scope.
export const chatDisabledType = 'urn:universam:problem:chat-disabled';

// The same query gives the same path, so widgets showing it share a request.
export function messagesListPath(q: MessageQuery): string {
  const params = new URLSearchParams();
  if (q.box !== 'inbox') params.set('box', q.box);
  if (q.tag) params.set('tag', q.tag);
  if (q.unacknowledged) params.set('unacknowledged', 'true');
  const query = params.toString();
  return query ? `${messagesPath}?${query}` : messagesPath;
}

const keepOut = { persist: false };
const fetchMessages = listFetcher<Message>('messages');
const fetchReceivers = (path: string) =>
  request<{ receivers: MessageReceiverOption[] }>(path).then((r) => r.receivers);

// null loads nothing: without messages.view, or offline.
export const useMessages = (q: MessageQuery | null) =>
  useResource<Message[]>(q && messagesListPath(q), fetchMessages, keepOut);

export const useMessage = (id: string | null) =>
  useResource<Message>(id && messagePath(id), undefined, keepOut);

export const useMessageReceivers = (enabled: boolean) =>
  useResource<MessageReceiverOption[]>(
    enabled ? messageReceiversPath : null,
    fetchReceivers,
    keepOut,
  );

const ifMatch = (m: Message) => ({ 'If-Match': `"${m.updated_at}"` });

export const messagesApi = {
  send: (d: MessageDraft) =>
    request<Message>(messagesPath, { method: 'POST', body: JSON.stringify(d) }),
  setTags: (m: Message, tags: string[]) =>
    request<Message>(messagePath(m.id), {
      method: 'PATCH',
      headers: ifMatch(m),
      body: JSON.stringify({ tags }),
    }),
  acknowledge: (id: string) =>
    request<Message>(`${messagePath(id)}/acknowledge`, { method: 'POST' }),
};

export const receiverOf = (m: Message, functionId: string | null | undefined) =>
  functionId ? m.receivers.find((r) => r.function.id === functionId) : undefined;

// The function is a To receiver that has not acknowledged yet.
export const awaitsAcknowledgement = (m: Message, functionId: string | null | undefined) => {
  const r = receiverOf(m, functionId);
  return r?.kind === 'to' && r.acknowledged_at === null;
};

export const toReceivers = (m: Message) => m.receivers.filter((r) => r.kind === 'to');
export const ccReceivers = (m: Message) => m.receivers.filter((r) => r.kind === 'cc');

// "2/3" while To receivers are missing; null once all acknowledged.
export function acknowledgementProgress(m: Message): string | null {
  const { acknowledged, total } = m.acknowledgements;
  return acknowledged >= total ? null : `${acknowledged}/${total}`;
}

// "Lead → Medic, Log (+1 CC)".
export function addressLine(m: Message): string {
  const to = toReceivers(m)
    .map((r) => r.function.name)
    .join(', ');
  const cc = ccReceivers(m).length;
  return `${m.sender.name} → ${to}${cc > 0 ? ` (+${cc} CC)` : ''}`;
}

// The messages of next that were not in prev, the inbox before: what
// arrived. Without a previous list (the first load) nothing is new.
export function arrivedMessages(prev: readonly Message[] | undefined, next: readonly Message[]) {
  if (!prev) return [];
  const known = new Set(prev.map((m) => m.id));
  return next.filter((m) => !known.has(m.id));
}

// The functions the compose form may offer for To or CC: those not picked
// in the other list. Always-CC ones that are neither the sender nor To are
// fixed CC chips, which the API adds itself.
export function composeOptions(
  receivers: readonly MessageReceiverOption[],
  senderId: string | null | undefined,
  to: readonly string[],
  cc: readonly string[],
) {
  const fixedCc = receivers.filter((r) => r.always_cc && r.id !== senderId && !to.includes(r.id));
  const fixed = new Set(fixedCc.map((r) => r.id));
  return {
    to: receivers.filter((r) => !cc.includes(r.id)),
    cc: receivers.filter((r) => !to.includes(r.id) && !fixed.has(r.id)),
    fixedCc,
  };
}
