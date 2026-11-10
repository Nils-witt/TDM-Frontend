import { useSyncExternalStore } from 'react';

// Offline while the event stream is down or the last request failed without
// an answer. Then the app shows what it cached and refuses changes, which
// could not be sent anyway and would be lost.

let socketLive = true;
let requestFailed = false;
// While offline: since when, for the banner.
let since: number | null = null;
const listeners = new Set<() => void>();

const isOffline = () => !socketLive || requestFailed;

function update(change: () => void) {
  const before = isOffline();
  change();
  const after = isOffline();
  if (before === after) return;
  since = after ? Date.now() : null;
  listeners.forEach((l) => l());
}

export const reportNetworkError = () =>
  update(() => {
    requestFailed = true;
  });

// When the API last answered, kept across reloads: what is cached is at
// most this current.
const lastAnswerKey = 'universam.lastApiAnswer';

function readLastAnswer(): number | null {
  try {
    const v = Number(localStorage.getItem(lastAnswerKey));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

let lastAnswer = readLastAnswer();

export const reportRequestOk = () => {
  lastAnswer = Date.now();
  try {
    localStorage.setItem(lastAnswerKey, String(lastAnswer));
  } catch {
    // storage blocked: the banner shows no time after a reload
  }
  update(() => {
    requestFailed = false;
  });
};

export const lastApiAnswer = () => lastAnswer;

export const setSocketLive = (live: boolean) =>
  update(() => {
    socketLive = live;
  });

export const offline = isOffline;

export function onConnectivityChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// null while online.
const snapshot = () => since;

export function useOfflineSince(): number | null {
  return useSyncExternalStore(onConnectivityChange, snapshot);
}

export const useOffline = () => useOfflineSince() !== null;

export const offlineMessage = 'Offline: changes are disabled until the API can be reached again.';

// fetch rejects with a TypeError when no answer arrives; oidc-client-ts turns
// its own timeouts into ErrorTimeout.
export const isNetworkError = (err: unknown) =>
  err instanceof TypeError || (err instanceof Error && err.name === 'ErrorTimeout');
