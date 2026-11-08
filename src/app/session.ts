import { createContext, use } from 'react';
import type { Principal } from '@/api/auth';
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
