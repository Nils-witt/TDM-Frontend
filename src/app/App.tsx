import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { type Principal } from '@/api/auth';
import { sessionEndedEvent, unauthorizedEvent } from '@/api/client';
import {
  forgetSession,
  rememberChoice,
  type SessionChoice,
  sessionApi,
  sessionStorageKey,
  storeSession,
} from '@/api/sessions';
import { isNetworkError, offline, useOffline } from '@/api/connectivity';
import {
  type AuthMode,
  clearOffline,
  dropTokens,
  logout,
  onTokenExpired,
  rememberSession,
  type SessionStart,
  startSession,
} from '@/auth/session';
import Alert from '@/components/Alert';
import ErrorBoundary from '@/components/ErrorBoundary';
import Spinner from '@/components/Spinner';
import Login from '@/pages/Login';
import ResponsiveShell from '@/responsive/ResponsiveShell';
import { SessionContext } from './session';
import { SessionPage } from './SessionPicker';
import Shell from './Shell';
import ViewGuard from './ViewGuard';
import UpdatePrompt from './update/UpdatePrompt';

type State =
  | { status: 'loading' }
  | { status: 'unavailable'; error: string }
  | { status: 'signedOut'; error: string | null }
  | {
      status: 'signedIn';
      principal: Principal;
      mode: AuthMode;
      offline?: boolean;
      // Why the user has to choose a function again.
      notice?: string | null;
    };

// Why a session ended, as the API reports it.
const endedNotices: Record<string, string> = {
  idle: 'Your session ended after a time without use. Choose your function again.',
  function_revoked: 'Your user function was changed or removed. Choose a function again.',
  switched: 'The function or scope was switched in another window.',
  admin: 'An administrator ended your session. Choose your function again.',
  logout: 'You logged out in another window. Choose your function again.',
  required: 'Choose the function you work as.',
};

const endedNotice = (reason: string) =>
  endedNotices[reason] ?? 'Your session has ended. Choose your function again.';

// What changed switches the function or scope in every tab: the data shown
// belongs to the old session, so the tab starts over.
function reloadForNewSession() {
  void clearOffline().finally(() => window.location.reload());
}

// How often an offline session checks whether the API answers again.
const recheckInterval = 15_000;
function App() {
  return (
    <>
      <Session />
      <UpdatePrompt />
    </>
  );
}

function Session() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(() => {
    startSession().then(setState, (err: unknown) =>
      setState({
        status: 'unavailable',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }, []);

  useEffect(load, [load]);

  const retry = () => {
    setState({ status: 'loading' });
    load();
  };

  const signedIn = state.status === 'signedIn';
  const verified = signedIn && !state.offline;
  const principal = signedIn ? state.principal : null;
  const mode = signedIn ? state.mode : null;
  const offlineNow = useOffline();

  useEffect(() => {
    if (verified && principal?.session && mode) void rememberSession(principal, mode);
  }, [verified, principal, mode]);

  // The session is per browser: another tab started, switched or ended it.
  useEffect(() => {
    if (!signedIn) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== sessionStorageKey || e.oldValue === e.newValue) return;
      reloadForNewSession();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [signedIn]);

  // The API refused the session (ended, idled, function revoked): choose a
  // function again.
  useEffect(() => {
    if (!signedIn) return;
    const onEnded = (e: Event) => {
      const reason = (e as CustomEvent<string>).detail;
      forgetSession();
      setState((s) =>
        s.status === 'signedIn' && s.principal.session
          ? {
              ...s,
              principal: {
                ...s.principal,
                session: null,
                permissions: { personal: [], functional: [] },
              },
              notice: endedNotice(reason),
            }
          : s,
      );
    };
    window.addEventListener(sessionEndedEvent, onEnded);
    return () => window.removeEventListener(sessionEndedEvent, onEnded);
  }, [signedIn]);

  const chooseSession = useCallback(
    async (c: SessionChoice) => {
      if (state.status !== 'signedIn') return;
      const started = await sessionApi.start(c);
      storeSession(state.principal, started.session.id);
      rememberChoice(state.principal, c);
      setState({
        ...state,
        principal: { ...started.whoami, session: started.session },
        notice: null,
      });
    },
    [state],
  );

  const switchSession = useCallback(
    async (c: SessionChoice) => {
      if (state.status !== 'signedIn') return;
      const started = await sessionApi.switch(c);
      storeSession(state.principal, started.session.id);
      rememberChoice(state.principal, c);
      reloadForNewSession();
    },
    [state],
  );

  useEffect(() => {
    if (!signedIn) return;
    let checking = false;
    const end = (error: string) => {
      // The cached data belongs to the session that ended.
      void clearOffline();
      forgetSession();
      void dropTokens();
      setState({ status: 'signedOut', error });
    };
    // A token may still be renewed (offline it could not be), so the session
    // only ends when starting it again fails.
    const recheck = (error: string) => {
      if (checking) return;
      checking = true;
      startSession()
        .then((s: SessionStart) => {
          if (s.status === 'signedOut') end(error);
          else if (!s.offline) setState(s);
        })
        .catch((err: unknown) => {
          if (!isNetworkError(err)) end(error);
        })
        .finally(() => {
          checking = false;
        });
    };
    const unauthorized = () => recheck('Your session has ended. Please log in again.');
    window.addEventListener(unauthorizedEvent, unauthorized);
    const offExpired = onTokenExpired(() => {
      // Renewed by the periodic check once the API answers again.
      if (!offline()) recheck('Your session has expired. Please log in again.');
    });
    const timer =
      state.status === 'signedIn' && (state.offline || offlineNow)
        ? setInterval(
            () => recheck('Your session has ended. Please log in again.'),
            recheckInterval,
          )
        : undefined;
    return () => {
      window.removeEventListener(unauthorizedEvent, unauthorized);
      offExpired();
      clearInterval(timer);
    };
  }, [signedIn, state, offlineNow]);

  const signOut = useCallback(async () => {
    await clearOffline();
    let result: 'redirected' | 'local';
    try {
      result = await logout();
    } catch (err) {
      // Offline the provider cannot end its session; this tab's still ends.
      if (!isNetworkError(err)) throw err;
      forgetSession();
      await dropTokens();
      result = 'local';
    }
    if (result === 'local') setState({ status: 'signedOut', error: null });
  }, []);

  const session = useMemo(
    () =>
      state.status === 'signedIn' && state.principal.session
        ? {
            principal: state.principal,
            mode: state.mode,
            session: state.principal.session,
            switchSession,
            logout: signOut,
          }
        : null,
    [state, signOut, switchSession],
  );

  switch (state.status) {
    case 'loading':
      return <Spinner />;
    case 'unavailable':
      return (
        <main className="container">
          <Alert severity="error">Cannot reach the API: {state.error}</Alert>
          <button type="button" className="btn mt" onClick={retry}>
            Retry
          </button>
        </main>
      );
    case 'signedOut':
      return (
        <Login
          error={state.error}
          onCertificate={(principal) => setState({ status: 'signedIn', principal, mode: 'proxy' })}
        />
      );
    case 'signedIn':
      if (!session) {
        return (
          <SessionPage
            principal={state.principal}
            notice={state.notice}
            onChoose={chooseSession}
            secondary={{ label: 'Log Out', onClick: () => void signOut() }}
          />
        );
      }
      return (
        <SessionContext value={session}>
          {/* Mounted only now: startSession may have replaced the URL (the
              login's return path), which a router mounted earlier would miss. */}
          <BrowserRouter>
            {/* The last resort, for the menu bar, providers and shells; widgets
                and /m pages have boundaries of their own. */}
            <ErrorBoundary what="app">
              <Routes>
                <Route
                  path="/m/*"
                  element={
                    <ViewGuard view="responsive">
                      <ResponsiveShell />
                    </ViewGuard>
                  }
                />
                <Route
                  path="*"
                  element={
                    <ViewGuard view="desktop">
                      <Shell />
                    </ViewGuard>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </SessionContext>
      );
  }
}

export default App;
