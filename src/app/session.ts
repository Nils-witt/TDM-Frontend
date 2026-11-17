import { createContext, use } from 'react';
import type { ApiSession, Principal } from '@/api/auth';
import { type ResponsivePage, responsivePageIds, type SessionChoice } from '@/api/sessions';
import type { AuthMode } from '@/auth/session';

export type Session = {
  principal: Principal;
  mode: AuthMode;
  // The user function and mission scope the user works as.
  session: ApiSession;
  // Ends the current session and starts one with the new choice; every tab
  // of the browser follows.
  switchSession: (c: SessionChoice) => Promise<void>;
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

// Member of the API's admin group: manages user functions and grants.
// Only hides what the API would refuse with 403 anyway.
export const isAdmin = (p: Principal) => p.admin;

export const useIsAdmin = () => isAdmin(useSession().principal);

// The API resolves the effective permissions (implications included, the
// historic ones only with the function's view), so this only looks them up.
export function hasPermission(p: Principal, name: string): boolean {
  return p.permissions.personal.includes(name) || p.permissions.functional.includes(name);
}

export const useHasPermission = (name: string) => hasPermission(useSession().principal, name);

// Whether the caller may do what needs the permission name, and if not, the
// hint shown on the disabled control.
export type Can = { allowed: boolean; hint: string | undefined };

export function can(p: Principal, name: string): Can {
  return hasPermission(p, name)
    ? { allowed: true, hint: undefined }
    : { allowed: false, hint: missingPermissionHint(name) };
}

export const useCan = (name: string): Can => can(useSession().principal, name);

export const missingPermissionHint = (name: string) =>
  `Needs the permission ${name} (switch the user function, or ask an administrator)`;

// The name of the session's scope: an empty ID is the Default scope.
export const sessionScopeName = (s: ApiSession) => (s.scope.id === '' ? 'Default' : s.scope.name);

// What the session's user function lets the UI show. Without views (no
// session, or an older API) everything is allowed.
export type AllowedViews = {
  desktop: boolean;
  responsive: boolean;
  pages: ReadonlySet<ResponsivePage>;
};

const allPages: ReadonlySet<ResponsivePage> = new Set(responsivePageIds);

export function allowedViews(p: Principal): AllowedViews {
  const v = p.views;
  if (!v) return { desktop: true, responsive: true, pages: allPages };
  const pages = new Set(
    responsivePageIds.filter((id) => v.responsive_pages.includes(id)),
  ) as ReadonlySet<ResponsivePage>;
  // The API keeps one view at least; should both be missing, the desktop
  // stays usable rather than redirecting back and forth.
  const desktop = v.desktop || !v.responsive;
  return { desktop, responsive: v.responsive, pages };
}

export const useAllowedViews = () => allowedViews(useSession().principal);
