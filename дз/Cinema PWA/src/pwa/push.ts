import { browserKey } from './identity.ts';
import { fingerprint } from '../utils/fingerprint.ts';

export interface PushTest {
  id: string;
  state: 'scheduled' | 'accepted' | 'received' | 'failed';
  createdAt: string;
  scheduledAt: string;
  receivedAt?: string;
  message?: string;
}
export interface PushSettings {
  configured: boolean;
  publicKey: string;
  subscribed: boolean;
  subscriptionId: string | null;
  lastTest: PushTest | null;
}

export function supportsPush() {
  return window.isSecureContext && 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}
export async function pushRequest(path = '', method = 'GET', body?: unknown): Promise<PushSettings> {
  let response;
  try {
    response = await fetch('/api/push' + path, { method, cache: 'no-store', signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json', 'X-Cinema-Client': browserKey() },
      body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new Error('Нет связи с сервером уведомлений. Повторите позже.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Сервер уведомлений недоступен.');
  if (typeof result.publicKey !== 'string' || typeof result.subscribed !== 'boolean') throw new Error('Некорректный ответ сервера уведомлений.');
  return result;
}
export async function localSubscription() {
  return (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription() ?? null;
}
export async function isPushActive(settings: PushSettings) {
  const subscription = await localSubscription();
  return !!subscription && Notification.permission === 'granted' && settings.subscribed
    && await fingerprint(subscription.endpoint) === settings.subscriptionId;
}

async function pushWorker() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) throw new Error('Откройте собранное приложение и дождитесь его подготовки.');
  const ready = await new Promise<boolean>(resolve => {
    const channel = new MessageChannel();
    const finish = (value: boolean) => { clearTimeout(timer); channel.port1.close(); resolve(value); };
    const timer = setTimeout(() => finish(false), 2000);
    channel.port1.onmessage = event => finish(event.data?.push === true);
    registration.active!.postMessage({ type: 'cinema-push-support' }, [channel.port2]);
  });
  if (!ready) throw new Error('Открыта прежняя версия приложения. Закройте все окна и вкладки Cinema PWA и откройте его снова.');
  return registration;
}

export async function enablePush(publicKey: string, renew = false) {
  // Permission is requested directly from the user's button action.
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Разрешите уведомления в настройках этого сайта в браузере.' : 'Запрос разрешения закрыт. Уведомления не включены.');
  const registration = await pushWorker();
  const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), character => character.charCodeAt(0));
  let subscription = await registration.pushManager.getSubscription();
  const currentKey = subscription?.options.applicationServerKey;
  if (subscription && (renew || (currentKey && Array.from(new Uint8Array(currentKey)).join(',') !== Array.from(bytes).join(',')))) {
    await subscription.unsubscribe(); subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  return pushRequest('/subscription', 'PUT', subscription.toJSON());
}

export async function disablePush() {
  // Cancel delivery in the browser even if the application server is unavailable.
  const subscription = await localSubscription();
  if (subscription) await subscription.unsubscribe();
  return pushRequest('/subscription', 'DELETE');
}
