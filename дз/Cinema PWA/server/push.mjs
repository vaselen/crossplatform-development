import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash, createECDH, ECDH, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';

const hash = value => createHash('sha256').update(value).digest('hex');
const root = fileURLToPath(new URL('../', import.meta.url));
// Project data is shared by VS Code and packaged desktop terminals on Windows.
// Vite explicitly denies access to pb_data; production serves only dist.
export const pushDirectory = path.join(root, 'pocketbase', 'pb_data', 'web-push');
function reject(status, message) { throw Object.assign(new Error(message), { status }); }

export function validateSubscription(value) {
  let url;
  try { url = new URL(value?.endpoint); } catch { reject(400, 'Некорректная подписка.'); }
  const host = url.hostname;
  const known = ['fcm.googleapis.com', 'android.googleapis.com', 'jmt17.google.com', 'web.push.apple.com', 'push.yandex.ru', 'push.yandex.net'].includes(host)
    || host.endsWith('.push.services.mozilla.com') || host.endsWith('.notify.windows.com') || host.endsWith('.notify.live.net');
  if (!known || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.href.length > 4096) reject(400, 'Адрес службы push не поддерживается.');
  for (const [key, length] of [['p256dh', 65], ['auth', 16]]) {
    const text = value.keys?.[key];
    if (typeof text !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(text) || Buffer.from(text, 'base64url').length !== length) reject(400, 'Повреждены ключи подписки.');
  }
  try { ECDH.convertKey(Buffer.from(value.keys.p256dh, 'base64url'), 'prime256v1'); }
  catch { reject(400, 'Повреждён открытый ключ подписки.'); }
  return { endpoint: url.href, keys: { p256dh: value.keys.p256dh, auth: value.keys.auth } };
}

async function body(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) reject(415, 'Нужен JSON-запрос.');
  const chunks = []; let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length <= 16384) chunks.push(chunk);
  }
  if (length > 16384) reject(413, 'Слишком большой запрос.');
  const text = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(text); } catch { reject(400, 'Некорректный JSON.'); }
}

export async function startPushServer({ port = 8094, directory = pushDirectory,
  subject = process.env.PUSH_VAPID_SUBJECT, send = webpush.sendNotification.bind(webpush),
  delayMs = 10000, cooldownMs = 30000 } = {}) {
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, 'state.json');
  let data;
  try { data = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Не удалось прочитать серверные настройки push.');
    data = { version: 1, ...webpush.generateVAPIDKeys(), subject: '', subscriptions: {} };
  }
  if (data.version !== 1 || !data.subscriptions || !data.publicKey || !data.privateKey) throw new Error('Повреждены серверные настройки push.');
  const pair = createECDH('prime256v1');
  pair.setPrivateKey(Buffer.from(data.privateKey, 'base64url'));
  if (pair.getPublicKey().toString('base64url') !== data.publicKey) throw new Error('Ключи push не соответствуют друг другу.');
  if (subject) data.subject = subject;
  if (data.subject && !/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/[^\s]+)$/.test(data.subject)) throw new Error('Укажите email или HTTPS-контакт через PUSH_VAPID_SUBJECT.');
  let writing = Promise.resolve();
  const save = () => {
    const next = writing.catch(() => {}).then(async () => {
      await writeFile(file + '.tmp', JSON.stringify(data), { mode: 0o600 });
      await rename(file + '.tmp', file);
    });
    writing = next; return next;
  };
  await save();
  const tests = new Map(), timers = new Map();
  const status = owner => ({ configured: !!data.subject, publicKey: data.publicKey,
    subscribed: !!data.subscriptions[owner], subscriptionId: data.subscriptions[owner] ? hash(data.subscriptions[owner].endpoint) : null,
    lastTest: tests.get(owner) || null });

  async function deliver(owner, id) {
    timers.delete(owner);
    const subscription = data.subscriptions[owner];
    if (!subscription || tests.get(owner)?.id !== id) return;
    try {
      await send(subscription, JSON.stringify({ title: 'КИНО.', body: 'Тестовое push-уведомление доставлено. Нажмите, чтобы открыть билеты.', url: '/my-tickets', deliveryId: id }), {
        vapidDetails: { subject: data.subject, publicKey: data.publicKey, privateKey: data.privateKey },
        TTL: 60, urgency: 'high', contentEncoding: 'aes128gcm', timeout: 10000,
      });
      const current = tests.get(owner);
      // The worker receipt may arrive before the push service's HTTP response.
      if (current?.id === id && current.state !== 'received') tests.set(owner, { ...current, state: 'accepted' });
    } catch (error) {
      if ([404, 410].includes(error.statusCode) && data.subscriptions[owner]?.endpoint === subscription.endpoint) { delete data.subscriptions[owner]; await save(); }
      if (tests.get(owner)?.id === id && tests.get(owner).state !== 'received') tests.set(owner, { ...tests.get(owner), state: 'failed',
        message: [404, 410].includes(error.statusCode) ? 'Подписка устарела. Включите уведомления снова.' : 'Служба push не приняла запрос. Проверьте интернет и настройки отправителя.' });
    }
  }

  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (statusCode, result) => { response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(result)); };
    try {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      if (request.method === 'POST' && pathname === '/api/push/received') {
        const receipt = await body(request);
        if (typeof receipt?.deliveryId !== 'string' || !/^[a-f0-9-]{36}$/.test(receipt.deliveryId)) reject(400, 'Некорректное подтверждение.');
        const found = [...tests].find(([, test]) => test.id === receipt.deliveryId && ['scheduled', 'accepted', 'received'].includes(test.state));
        if (!found) reject(404, 'Тест не найден.');
        const receivedAt = new Date().toISOString();
        tests.set(found[0], { ...found[1], state: 'received', receivedAt });
        console.info(`[Cinema PWA push] Service worker confirmed receipt at ${receivedAt}`);
        json(200, { received: true }); return;
      }
      const key = request.headers['x-cinema-client'];
      if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) reject(401, 'Не удалось определить браузер.');
      const owner = hash(key);
      if (request.method === 'GET' && pathname === '/api/push') { json(200, status(owner)); return; }
      if (request.method === 'PUT' && pathname === '/api/push/subscription') {
        if (!data.subject) reject(503, 'Отправка уведомлений пока не настроена на сервере.');
        data.subscriptions[owner] = validateSubscription(await body(request));
        await save(); json(200, status(owner)); return;
      }
      if (request.method === 'DELETE' && pathname === '/api/push/subscription') {
        clearTimeout(timers.get(owner)); timers.delete(owner); tests.delete(owner);
        delete data.subscriptions[owner]; await save(); json(200, status(owner)); return;
      }
      if (request.method === 'POST' && pathname === '/api/push/test') {
        await body(request);
        if (!data.subject) reject(503, 'Отправка уведомлений пока не настроена на сервере.');
        if (!data.subscriptions[owner]) reject(409, 'Сначала включите уведомления.');
        const previous = tests.get(owner);
        if (previous && Date.now() - Date.parse(previous.createdAt) < cooldownMs) reject(429, 'Следующий тест можно отправить через 30 секунд.');
        const id = randomUUID();
        tests.set(owner, { id, state: 'scheduled', createdAt: new Date().toISOString(), scheduledAt: new Date(Date.now() + delayMs).toISOString() });
        timers.set(owner, setTimeout(() => { void deliver(owner, id).catch(() => {}); }, delayMs));
        json(202, status(owner)); return;
      }
      reject(404, 'Адрес не найден.');
    } catch (error) { json(error.status || 500, { message: error.status ? error.message : 'Не удалось выполнить запрос push.' }); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, directory, async close() {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    await writing.catch(() => {});
  } };
}
