import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { disablePush, enablePush, isPushActive, localSubscription, pushRequest, supportsPush, type PushSettings } from '../pwa/push';

export default function NotificationsPage() {
  const [supported] = useState(supportsPush);
  const [settings, setSettings] = useState<PushSettings | null>(null);
  const [active, setActive] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);
  const [permission, setPermission] = useState(() => supported ? Notification.permission : 'default');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(supported);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!supported) return;
    try {
      const local = await localSubscription();
      setHasLocal(!!local); setPermission(Notification.permission);
      if (!local || Notification.permission !== 'granted') setActive(false);
      const result = await pushRequest();
      setSettings(result);
      setPending(!!result.lastTest && ['scheduled', 'accepted'].includes(result.lastTest.state)
        && Date.now() - Date.parse(result.lastTest.createdAt) < 90000);
      setActive(await isPushActive(result));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось проверить уведомления.'); }
    finally { setLoading(false); }
  }, [supported]);
  useEffect(() => {
    void Promise.resolve().then(reload); window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [reload]);
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => { void reload(); }, 3000);
    return () => clearInterval(timer);
  }, [pending, reload]);

  async function perform(action: () => Promise<PushSettings>) {
    if (busy) return;
    setBusy(true); setError('');
    try { setSettings(await action()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось выполнить действие.'); }
    finally { await reload(); setBusy(false); }
  }
  const test = settings?.lastTest;
  return <div className="max-w-3xl mx-auto px-6 py-12">
    <Link to="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">← На главную</Link>
    <h1 className="text-4xl font-bold tracking-tight mt-6 mb-8">Уведомления</h1>
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-5">
      {!supported ? <p>Push-уведомления недоступны в этом окне браузера. На iPhone откройте установленное приложение с экрана «Домой».</p>
        : loading ? <p role="status">Проверяем уведомления…</p> : <>
          <p>{active ? 'Уведомления включены для этого браузера.' : permission === 'denied'
            ? 'Уведомления заблокированы. Разрешите их в настройках этого сайта в браузере.' : 'Получайте уведомления от КИНО на этом устройстве.'}</p>
          {settings && !settings.configured && <p role="status" className="text-sm text-[var(--text-muted)]">Отправка уведомлений пока не настроена на сервере.</p>}
          <div className="flex flex-wrap gap-3">
            {!active && <button disabled={busy || !settings?.configured || permission === 'denied'} onClick={() => { if (settings) void perform(() => enablePush(settings.publicKey, !settings.subscribed && settings.lastTest?.state === 'failed')); }} className="action-button">Включить уведомления</button>}
            {(active || settings?.subscribed || hasLocal) && <button disabled={busy} onClick={() => { void perform(disablePush); }} className="px-6 py-3 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50">Отключить уведомления</button>}
          </div>
          {active && <div className="pt-5 border-t border-[var(--border)]">
            <button disabled={busy || !!pending} onClick={() => { void perform(() => pushRequest('/test', 'POST', {})); }} className="action-button">Отправить тест через 10 секунд</button>
          </div>}
        </>}
      {test && <p role="status" className="text-sm text-[var(--text-muted)]">{test.state === 'scheduled'
        ? 'Тест запланирован. Вкладку можно закрыть; сервер должен продолжать работать.'
        : test.state === 'accepted' ? 'Служба доставки приняла тест. Ожидаем получение на устройстве.'
          : test.state === 'received' ? 'Тест получен устройством. Нажатие на уведомление откроет «Мои билеты».' : test.message}</p>}
      {error && <p role="alert" className="text-sm text-[var(--accent)]">{error}</p>}
      {supported && !loading && <button type="button" onClick={() => { setError(''); void reload(); }} className="text-sm text-[var(--text-muted)] underline">Проверить состояние</button>}
    </div>
  </div>;
}
