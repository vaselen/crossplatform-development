import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { checkConnection, useConnection, watchConnection } from '../pwa/connection';
import { Loading } from './Layout';
import { watchFeedback } from '../pwa/feedbackSync';

export function ConnectionWatch() {
  useEffect(watchConnection, []);
  useEffect(watchFeedback, []);
  return null;
}

export function SavedNotice({ savedAt, kind, warning }: { savedAt: string; kind?: 'catalog' | 'purchases'; warning?: string }) {
  if (warning) return <p role="status" className="text-sm text-[var(--text-muted)] my-4">{warning}</p>;
  if (!kind) return null;
  const date = new Date(savedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  return <p role="status" className="text-sm text-[var(--text-muted)] my-4">
    {kind === 'catalog' ? 'Сохранённая афиша' : 'Сохранённые билеты'} · {date}.
    {' '}{kind === 'purchases' ? 'Статус покупок проверим после подключения.' : 'Нет связи с сервером.'}
    {' '}<button type="button" onClick={() => { void checkConnection(); }} className="underline hover:text-[var(--text)]">Проверить связь</button>
  </p>;
}

export function ConnectionRequired({ message }: { message: string }) {
  return <div role="status" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
    <p className="text-[var(--text-muted)] mb-4">{message}</p>
    <button type="button" className="text-sm text-[var(--accent)] hover:underline" onClick={() => { void checkConnection(); }}>Проверить соединение</button>
  </div>;
}

export function OnlineOnly({ children, message }: { children: ReactNode; message: string }) {
  const online = useConnection(state => state.online);
  if (online === null) return <Loading />;
  if (!online) return <main className="max-w-3xl mx-auto px-6 pt-24 pb-12">
    <Link to="/" className="inline-block text-sm text-[var(--text-muted)] mb-6">← К афише</Link>
    <ConnectionRequired message={message} />
  </main>;
  return children;
}
