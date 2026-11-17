import { createContext, use } from 'react';
import type { Principal } from '@/api/auth';
import { impliedPermissions } from '@/api/permissions';
import type { AuthMode } from '@/auth/session';

export type Session = {
  principal: Principal;
  mode: AuthMode;
  // For a client certificate, only returns to the login page.
  logout: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error('useSession outside of App');
  return session;
}

export const displayName = (p: Principal) => p.name || p.username || p.sub;

// Only hides what the API would refuse with 403 anyway.
export const isAdmin = (p: Principal) => p.permissions?.includes('admin') ?? false;

export const useIsAdmin = () => isAdmin(useSession().principal);

// Admins hold every permission; a grant also grants what it implies.
export function hasPermission(p: Principal, name: string): boolean {
  if (isAdmin(p)) return true;
  return (p.permissions ?? []).some(
    (granted) => granted === name || (impliedPermissions[granted]?.includes(name) ?? false),
  );
}

export const useHasPermission = (name: string) => hasPermission(useSession().principal, name);
