import { database } from './database.ts';

export const FEEDBACK_SYNC_TAG = 'cinema-feedback';
export interface FeedbackMessage {
  requestId: string;
  clientKey: string;
  name: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'sent' | 'failed';
  receivedAt?: string;
  error?: string;
}

export async function readFeedback(clientKey?: string) {
  const items = await (await database()).getAll('feedback');
  return items.filter(item => !clientKey || item.clientKey === clientKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.requestId.localeCompare(b.requestId));
}

export async function saveFeedback(clientKey: string, name: string, message: string) {
  name = name.trim(); message = message.trim();
  if (name.length < 2 || name.length > 80) throw new Error('Имя должно содержать от 2 до 80 символов.');
  if (message.length < 10 || message.length > 2000) throw new Error('Сообщение должно содержать от 10 до 2000 символов.');
  const item: FeedbackMessage = { requestId: crypto.randomUUID(), clientKey, name, message,
    createdAt: new Date().toISOString(), status: 'pending' };
  // Commit before any network request: closing the page must not lose the message.
  await (await database()).add('feedback', item);
  return item;
}

export async function removeFailedFeedback(requestId: string, clientKey: string) {
  const tx = (await database()).transaction('feedback', 'readwrite');
  const item = await tx.store.get(requestId);
  if (item?.clientKey === clientKey && item.status === 'failed') await tx.store.delete(requestId);
  await tx.done;
}

async function finish(item: FeedbackMessage, change: Partial<FeedbackMessage>) {
  const tx = (await database()).transaction('feedback', 'readwrite');
  const current = await tx.store.get(item.requestId);
  // Page and service worker may send concurrently. A confirmed result wins.
  if (current && (current.status === 'pending' || change.status === 'sent')) await tx.store.put({ ...current, ...change });
  const sent = (await tx.store.getAll()).filter(entry => entry.clientKey === item.clientKey && entry.status === 'sent')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const old of sent.slice(10)) await tx.store.delete(old.requestId);
  await tx.done;
}

let sending: Promise<void> | undefined;
export function flushFeedback(changed: () => void | Promise<void> = () => {}) {
  if (sending) return sending;
  sending = (async () => {
    for (const item of (await readFeedback()).filter(entry => entry.status === 'pending')) {
      const response = await fetch('/api/cinema/feedback', {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', 'X-Cinema-Client': item.clientKey },
        body: JSON.stringify({ requestId: item.requestId, name: item.name, message: item.message }),
      });
      // Transient failures stay in the queue. Rejecting waitUntil lets the browser retry.
      if (response.status >= 500 || response.status === 408 || response.status === 429) throw new Error('Сервер временно недоступен.');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        await finish(item, { status: 'failed', error: typeof body.message === 'string' ? body.message.slice(0, 300) : 'Сервер отклонил сообщение.' });
      } else {
        const result = await response.json();
        if (result.requestId !== item.requestId || !Number.isFinite(Date.parse(result.receivedAt))) throw new Error('Не получено подтверждение отправки.');
        await finish(item, { status: 'sent', receivedAt: result.receivedAt });
      }
      // A UI refresh failure cannot undo a successfully stored server confirmation.
      await Promise.resolve().then(changed).catch(() => {});
    }
  })().finally(() => { sending = undefined; });
  return sending;
}
