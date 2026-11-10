import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { AuthMode } from '@/auth/session';
import { currentAccessToken, onAccessTokenRenewed, websocketUrl } from './client';
import { setSocketLive } from './connectivity';
import { changedPaths, eventsPath, everything, LiveContext, type ServerEvent } from './events';
import { useResourceCache } from './resource';

const minRetryDelay = 1000;
const maxRetryDelay = 30_000;

// Keeps a WebSocket to the API open while signed in and reloads the shown
// resources whose entity types changed. With a token, it authenticates with
// its first message and again after each renewal, as a browser cannot send
// the Authorization header on a WebSocket; behind the client certificate
// proxy the upgrade request is authenticated itself.
function EventsProvider({ mode, children }: { mode: AuthMode; children: ReactNode }) {
  const cache = useResourceCache();
  const [live, setLive] = useState(true);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = minRetryDelay;
    let readyBefore = false;
    let closedBefore = false;
    let stopped = false;

    const sendToken = () => {
      const token = currentAccessToken();
      if (mode !== 'oidc' || !token || ws?.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    const connect = () => {
      const socket = new WebSocket(websocketUrl(eventsPath));
      ws = socket;
      socket.onopen = sendToken;
      socket.onmessage = (msg) => {
        let ev: ServerEvent;
        try {
          ev = JSON.parse(msg.data as string) as ServerEvent;
        } catch {
          return;
        }
        if (ev.type === 'ready') {
          setLive(true);
          setSocketLive(true);
          delay = minRetryDelay;
          // Whatever changed while disconnected was not announced, and what
          // failed to load before the first connection is the offline copy.
          if (readyBefore || closedBefore) cache.reloadShown(everything);
          readyBefore = true;
        } else if (ev.type === 'changed') {
          cache.reloadShown(changedPaths(ev.types));
        } else if (ev.type === 'resync') {
          cache.reloadShown(everything);
        }
      };
      // Also after a rejected or expired token (4401): the session renews it
      // or a 401 of the next request shows the login page.
      socket.onclose = () => {
        if (ws !== socket || stopped) return;
        closedBefore = true;
        setLive(false);
        setSocketLive(false);
        retry = setTimeout(connect, delay);
        delay = Math.min(delay * 2, maxRetryDelay);
      };
    };

    connect();
    const unsubscribe = onAccessTokenRenewed(sendToken);
    return () => {
      stopped = true;
      // Not offline once signed out: the login page has no stream.
      setSocketLive(true);
      unsubscribe();
      clearTimeout(retry);
      ws?.close();
    };
  }, [cache, mode]);

  const state = useMemo(() => ({ live }), [live]);
  return <LiveContext value={state}>{children}</LiveContext>;
}

export default EventsProvider;
