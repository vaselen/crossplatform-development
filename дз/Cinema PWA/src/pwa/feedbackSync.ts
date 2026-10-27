import { FEEDBACK_SYNC_TAG, flushFeedback, readFeedback } from './feedback.ts';
import { useConnection } from './connection.ts';

export const FEEDBACK_CHANGED = 'cinema-feedback-changed';
export const notifyFeedback = () => { window.dispatchEvent(new Event(FEEDBACK_CHANGED)); };
type SyncRegistration = ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };

async function registerSync() {
  const registration = await navigator.serviceWorker?.getRegistration() as SyncRegistration | undefined;
  await registration?.sync?.register(FEEDBACK_SYNC_TAG);
}

export function wakeFeedback() {
  void readFeedback().then(items => {
    if (!items.some(item => item.status === 'pending')) return;
    // Feature detection, not a browser-name check. Denied/unsupported sync is optional.
    void registerSync().catch(() => {});
    if (useConnection.getState().online === true) void flushFeedback(notifyFeedback).catch(() => {});
  }).catch(() => {});
}

export function watchFeedback() {
  // Reuse the existing API health check, including its 15-second visible-page retry.
  const unsubscribe = useConnection.subscribe(() => {
    if (useConnection.getState().online === true) wakeFeedback();
  });
  const onMessage = (event: MessageEvent) => { if (event.data?.type === FEEDBACK_CHANGED) notifyFeedback(); };
  navigator.serviceWorker?.addEventListener('message', onMessage);
  navigator.serviceWorker?.addEventListener('controllerchange', wakeFeedback);
  wakeFeedback();
  return () => {
    unsubscribe();
    navigator.serviceWorker?.removeEventListener('message', onMessage);
    navigator.serviceWorker?.removeEventListener('controllerchange', wakeFeedback);
  };
}
