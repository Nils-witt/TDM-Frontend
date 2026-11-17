import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { mobileBasePath } from './mobileRoute';
import { useAllowedViews } from './session';

// Sends a session to the view its user function allows: a responsive-only
// function to /m, a desktop-only one away from it. Only steers the UI; the
// API still checks every permission.
function ViewGuard({ view, children }: { view: 'desktop' | 'responsive'; children: ReactNode }) {
  const allowed = useAllowedViews();
  if (view === 'responsive' && !allowed.responsive) return <Navigate to="/" replace />;
  if (view === 'desktop' && !allowed.desktop) return <Navigate to={mobileBasePath} replace />;
  return children;
}

export default ViewGuard;
