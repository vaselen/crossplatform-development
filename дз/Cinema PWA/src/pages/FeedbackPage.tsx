import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { browserKey } from '../pwa/identity';
import { useConnection } from '../pwa/connection';
import { readFeedback, removeFailedFeedback, saveFeedback, type FeedbackMessage } from '../pwa/feedback';
import { FEEDBACK_CHANGED, notifyFeedback, wakeFeedback } from '../pwa/feedbackSync';

const labels = { pending: 'Ожидает отправки', sent: 'Отправлено', failed: 'Не отправлено' };

export default function FeedbackPage() {
  const offline = useConnection(state => state.online === false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<FeedbackMessage[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const reload = useCallback(() => {
    void Promise.resolve().then(() => readFeedback(browserKey())).then(setItems)
      .catch(() => setError('Не удалось прочитать сообщения. Разрешите хранение данных сайта.'));
  }, []);
  useEffect(() => {
    void reload();
    window.addEventListener(FEEDBACK_CHANGED, reload);
    window.addEventListener('focus', reload);
    return () => { window.removeEventListener(FEEDBACK_CHANGED, reload); window.removeEventListener('focus', reload); };
  }, [reload]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
      await saveFeedback(browserKey(), name, message);
      setMessage(''); notifyFeedback(); wakeFeedback();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось сохранить сообщение.');
    } finally { setSaving(false); }
  }
  async function remove(requestId: string) {
    try { await removeFailedFeedback(requestId, browserKey()); void reload(); }
    catch { setError('Не удалось удалить сообщение с устройства.'); }
  }

  return <div className="max-w-3xl mx-auto px-6 py-12">
    <Link to="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">← На главную</Link>
    <h1 className="text-4xl font-bold tracking-tight mt-6 mb-8">Обратная связь</h1>
    <form onSubmit={submit} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-5">
      <div><label htmlFor="feedback-name" className="block text-sm mb-2">Имя</label>
        <input id="feedback-name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} className="field" /></div>
      <div><label htmlFor="feedback-message" className="block text-sm mb-2">Сообщение</label>
        <textarea id="feedback-message" required minLength={10} maxLength={2000} rows={5} value={message} onChange={event => setMessage(event.target.value)} className="field resize-y" /></div>
      {offline && <p role="status" className="text-sm text-[var(--text-muted)]">Нет связи с сервером. Сообщение сохранится на устройстве и будет отправлено после подключения.</p>}
      {error && <p role="alert" className="text-sm text-[var(--accent)]">{error}</p>}
      <button disabled={saving} className="action-button">{saving ? 'Сохранение…' : 'Отправить'}</button>
    </form>

    {items.length > 0 && <section className="mt-10">
      <h2 className="text-2xl font-bold mb-5">Мои сообщения</h2>
      <div className="space-y-4">{[...items].reverse().map(item => <article key={item.requestId} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex flex-wrap justify-between gap-2 text-sm mb-3">
          <time dateTime={item.receivedAt || item.createdAt} className="text-[var(--text-muted)]">{new Date(item.receivedAt || item.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</time>
          <span role="status" className={item.status === 'failed' ? 'text-[var(--accent)]' : ''}>{labels[item.status]}</span>
        </div>
        <p className="whitespace-pre-wrap break-words">{item.message}</p>
        {item.status === 'failed' && <div className="mt-3 text-sm"><p className="text-[var(--accent)]">{item.error}</p><button type="button" onClick={() => { void remove(item.requestId); }} className="text-[var(--text-muted)] underline mt-2">Удалить с устройства</button></div>}
      </article>)}</div>
    </section>}
  </div>;
}
