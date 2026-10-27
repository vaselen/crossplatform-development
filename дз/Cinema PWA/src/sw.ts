/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { FEEDBACK_SYNC_TAG, flushFeedback } from './pwa/feedback';
import { notificationMessage } from './pwa/pushNotification';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision?: string | null }>;
};

// Vite injects the actual files of this build, including posters and local fonts.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Only document navigation falls back to the SPA shell. API/admin requests
// must never receive index.html or an old booking/seat response from Cache Storage.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  denylist: [/^\/api(?:\/|$)/, /^\/_\//],
}));
for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const) {
  registerRoute(({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/'), new NetworkOnly({ fetchOptions: { cache: 'no-store' } }), method);
}

// Claim the first visit after successful installation. No forced activation,
// reload or update dialog: the update UX will be agreed in a later stage.
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// Background Sync is optional. The open page has a separate connection-based retry.
self.addEventListener('sync', event => {
  const sync = event as ExtendableEvent & { tag: string };
  if (sync.tag !== FEEDBACK_SYNC_TAG) return;
  sync.waitUntil(flushFeedback(async () => {
    for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage({ type: 'cinema-feedback-changed' });
  }));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'cinema-push-support') event.ports[0]?.postMessage({ push: true });
});

self.addEventListener('push', event => {
  let payload: unknown;
  try { payload = event.data?.json(); } catch { /* Still show a visible generic notification. */ }
  const message = notificationMessage(payload, self.location.origin);
  event.waitUntil((async () => {
    await self.registration.showNotification(message.title, {
      body: message.body, icon: '/icons/icon-192.png', tag: 'cinema-test-push',
      data: { url: message.url, deliveryId: message.deliveryId },
    });
    if (message.deliveryId) await fetch('/api/push/received', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(4000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId: message.deliveryId }),
    }).catch(() => {});
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const { url } = notificationMessage(event.notification.data, self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url === url);
    if (existing) await existing.focus();
    else await self.clients.openWindow(url);
  })());
});
