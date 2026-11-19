import { request } from './client';
import type { EntityMeta } from './entity';
import { useResource } from './resource';

// Tags of messages. A global tag is offered in every scope and changed by
// admins only; a scope tag belongs to the session's scope and is changed by
// its sessions with messages.view. Deleting is soft, so messages keep
// showing the name: the list asks for the deleted ones too (deleted=true).
export type MessageTag = EntityMeta & {
  id: string;
  name: string;
  // #rrggbb, lower case.
  color: string;
  global: boolean;
  // A scope tag's scope; null for global tags and the Default scope's.
  scope: string | null;
  deleted: boolean;
};

export type MessageTagInput = { name: string; color: string; global?: boolean };

export const messageTagsPath = '/api/v1/message-tags';
const tagPath = (id: string) => `${messageTagsPath}/${encodeURIComponent(id)}`;
const listPath = `${messageTagsPath}?deleted=true`;

const fetchTags = (path: string) =>
  request<{ message_tags: MessageTag[] }>(path).then((r) => r.message_tags);

// Global first, each by name, the deleted ones included (filter with
// activeTags). null loads nothing.
export const useMessageTags = (enabled: boolean) =>
  useResource<MessageTag[]>(enabled ? listPath : null, fetchTags, { persist: false });

export const activeTags = (tags: readonly MessageTag[] | undefined) =>
  (tags ?? []).filter((t) => !t.deleted);

const ifMatch = (t: MessageTag) => ({ 'If-Match': `"${t.updated_at}"` });

export const messageTagsApi = {
  create: (input: MessageTagInput) =>
    request<MessageTag>(messageTagsPath, { method: 'POST', body: JSON.stringify(input) }),
  patch: (t: MessageTag, input: Partial<Pick<MessageTagInput, 'name' | 'color'>>) =>
    request<MessageTag>(tagPath(t.id), {
      method: 'PATCH',
      headers: ifMatch(t),
      body: JSON.stringify(input),
    }),
  remove: (t: MessageTag) =>
    request<void>(tagPath(t.id), { method: 'DELETE', headers: ifMatch(t) }),
};

// A global tag needs an admin; a scope tag messages.view (or an admin).
export const canChangeTag = (t: MessageTag, admin: boolean, canView: boolean) =>
  t.global ? admin : admin || canView;

// Black or white, whichever reads better on the tag's color.
export function tagTextColor(color: string): '#000000' | '#ffffff' {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!m) return '#000000';
  const lin = (hex: string) => {
    const c = parseInt(hex, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin(m[1]!) + 0.7152 * lin(m[2]!) + 0.0722 * lin(m[3]!);
  return luminance > 0.4 ? '#000000' : '#ffffff';
}
