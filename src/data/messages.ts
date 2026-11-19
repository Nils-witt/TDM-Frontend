import { useEffect, useEffectEvent, useRef } from 'react';
import { arrivedMessages, type Message, useMessages } from '@/api/messages';
import { useMessageSettings, priorityLabel } from '@/api/messageSettings';
import { useOffline } from '@/api/connectivity';
import { useHasPermission, useSession } from '@/app/session';
import { useSelectedScope } from './selectedScope';

// The label of priority p (1-4) as the admins named it.
export function usePriorityLabel(p: number): string {
  const { data } = useMessageSettings();
  return priorityLabel(data?.priority_labels, p);
}

// The labels of the priorities 1-4.
export function usePriorityLabels(): string[] {
  const { data } = useMessageSettings();
  return [1, 2, 3, 4].map((p) => priorityLabel(data?.priority_labels, p));
}

// Whether the chat is on in the session's scope: the scope's chat_enabled,
// global_chat_enabled for Default. undefined while unknown (the settings are
// loading).
export function useChatEnabled(): boolean | undefined {
  const { scopeId, scope } = useSelectedScope();
  const { data } = useMessageSettings();
  if (scopeId !== null) return scope?.chat_enabled ?? false;
  return data?.global_chat_enabled;
}

// What the session may do with messages, and the function it acts as.
// Messages are online only, so offline nothing loads (like patients).
export function useMessageAccess() {
  const { session } = useSession();
  const offline = useOffline();
  const view = useHasPermission('messages.view');
  const send = useHasPermission('messages.send');
  const viewAll = useHasPermission('messages.view_all');
  return {
    functionId: session?.function.id ?? null,
    view,
    send,
    viewAll,
    offline,
    // Load lists only while they can answer.
    load: view && !offline,
  };
}

// The messages the session's function has yet to acknowledge as a To
// receiver (the menu bar indicator, /m's badge); null while unknown or
// without messages.view.
export function useUnacknowledgedMessages() {
  const access = useMessageAccess();
  const list = useMessages(access.load ? { box: 'inbox', unacknowledged: true } : null);
  return { list, count: access.load ? (list.data?.length ?? null) : null };
}

// Calls onArrive with the messages that appear in the session function's
// inbox (To or CC) after the first load: what a live messages event brought.
// Nothing on the first load, so a reload does not repeat old ones.
export function useMessageArrivals(onArrive: (arrived: Message[]) => void) {
  const access = useMessageAccess();
  const inbox = useMessages(access.load ? { box: 'inbox' } : null);
  const previous = useRef<Message[] | undefined>(undefined);
  const notify = useEffectEvent(onArrive);
  useEffect(() => {
    const data = inbox.data;
    if (!data) return;
    const arrived = arrivedMessages(previous.current, data);
    previous.current = data;
    if (arrived.length > 0) notify(arrived);
  }, [inbox.data]);
}

// Priorities I and II stay until dismissed; III and IV close on their own
// after this.
export const toastTimeout = (m: Pick<Message, 'priority'>) => (m.priority <= 2 ? null : 8000);
