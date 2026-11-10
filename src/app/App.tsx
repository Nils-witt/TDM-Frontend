import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { type Principal } from '@/api/auth';
import { unauthorizedEvent } from '@/api/client';
import { type AuthMode, dropTokens, logout, onTokenExpired, startSession } from '@/auth/session';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import Login from '@/pages/Login';
import ResponsiveShell from '@/responsive/ResponsiveShell';
import { SessionContext } from './session';
import Shell from './Shell';
import UpdatePrompt from './update/UpdatePrompt';

type State =
  | { status: 'loading' }
  | { status: 'unavailable'; error: string }
  | { status: 'signedOut'; error: string | null }
  | { status: 'signedIn'; principal: Principal; mode: AuthMode };
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

  useEffect(() => {
    if (!signedIn) return;
    const end = (error: string) => {
      void dropTokens();
      setState({ status: 'signedOut', error });
    };
    const unauthorized = () => end('Your session has ended. Please log in again.');
    window.addEventListener(unauthorizedEvent, unauthorized);
    const offExpired = onTokenExpired(() => end('Your session has expired. Please log in again.'));
    return () => {
      window.removeEventListener(unauthorizedEvent, unauthorized);
      offExpired();
    };
  }, [signedIn]);

  const signOut = useCallback(async () => {
    if ((await logout()) === 'local') setState({ status: 'signedOut', error: null });
  }, []);

  const session = useMemo(
    () =>
      state.status === 'signedIn'
        ? {
            principal: state.principal,
            mode: state.mode,
            logout: signOut,
          }
        : null,
    [state, signOut],
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
      return (
        <SessionContext value={session}>
          {/* Mounted only now: startSession may have replaced the URL (the
              login's return path), which a router mounted earlier would miss. */}
          <BrowserRouter>
            <Routes>
              <Route path="/m/*" element={<ResponsiveShell />} />
              <Route path="*" element={<Shell />} />
            </Routes>
          </BrowserRouter>
        </SessionContext>
      );
  }
}

export default App;
