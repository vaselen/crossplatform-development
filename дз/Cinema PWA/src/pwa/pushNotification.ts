export function notificationMessage(payload: unknown, origin: string) {
  const value = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  let url = new URL('/my-tickets', origin);
  try {
    const requested = new URL(typeof value.url === 'string' ? value.url : '/my-tickets', origin);
    if (requested.origin === origin && ['/', '/my-tickets', '/feedback'].includes(requested.pathname)) url = requested;
  } catch { /* Keep the application destination. */ }
  return {
    title: typeof value.title === 'string' && value.title.trim() ? value.title.slice(0, 80) : 'КИНО.',
    body: typeof value.body === 'string' ? value.body.slice(0, 300) : 'Новое уведомление от КИНО.',
    url: url.href,
    deliveryId: typeof value.deliveryId === 'string' && /^[a-f0-9-]{36}$/.test(value.deliveryId) ? value.deliveryId : undefined,
  };
}
