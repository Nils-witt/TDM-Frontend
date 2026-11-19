import { request } from './client';
import type { Timestamp } from './entity';
import { useResource } from './resource';

// The admins' chat settings: the labels of the priorities 1-4 and whether
// the chat is on in the Default scope (a scope's own flag is its
// chat_enabled). Readable by everyone, replaced by admins only.
export type MessageSettings = {
  priority_labels: string[];
  global_chat_enabled: boolean;
  created_at?: Timestamp;
  created_by?: string;
  updated_at?: Timestamp;
  updated_by?: string;
};

export const messageSettingsPath = '/api/v1/message-settings';

export const defaultPriorityLabels = ['I', 'II', 'III', 'IV'];

// A 404 is an API older than the chat: the chat stays off.
export const useMessageSettings = () => useResource<MessageSettings>(messageSettingsPath);

export const messageSettingsApi = {
  replace: (s: Pick<MessageSettings, 'priority_labels' | 'global_chat_enabled'>) =>
    request<MessageSettings>(messageSettingsPath, { method: 'PUT', body: JSON.stringify(s) }),
};

// The label of priority p (1-4), the Roman numeral without settings.
export function priorityLabel(labels: readonly string[] | undefined, p: number): string {
  return labels?.[p - 1]?.trim() || defaultPriorityLabels[p - 1] || String(p);
}
