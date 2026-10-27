import { create } from 'zustand';
import { ClientResponseError } from 'pocketbase';

export const useConnection = create<{ online: boolean | null }>(() => ({ online: null }));
export const setConnection = (online: boolean) => useConnection.setState({ online });

export function isUnavailable(error: unknown) {
  return error instanceof ClientResponseError && (error.status === 0 || error.status >= 500);
}

// A network interface can be connected while PocketBase is unavailable.
// Check the API itself instead of treating navigator.onLine as proof.
export async function requestOnline<T>(request: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 4000);
  try {
    const result = await request(controller.signal);
    if (!signal?.aborted) setConnection(true);
    return result;
  } catch (error) {
    if (!signal?.aborted && isUnavailable(error)) setConnection(false);
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

let checking: Promise<boolean> | null = null;
export function checkConnection(): Promise<boolean> {
  if (checking) return checking;
  checking = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch('/api/health', { cache: 'no-store', signal: controller.signal });
      setConnection(response.ok);
      return response.ok;
    } catch {
      setConnection(false);
      return false;
    } finally { clearTimeout(timeout); checking = null; }
  })();
  return checking;
}

export function watchConnection() {
  const check = () => { void checkConnection(); };
  const checkVisible = () => { if (document.visibilityState === 'visible') check(); };
  check();
  window.addEventListener('online', check);
  window.addEventListener('offline', check);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', checkVisible);
  const timer = setInterval(checkVisible, 15000);
  return () => {
    clearInterval(timer);
    window.removeEventListener('online', check);
    window.removeEventListener('offline', check);
    window.removeEventListener('focus', check);
    document.removeEventListener('visibilitychange', checkVisible);
  };
}
