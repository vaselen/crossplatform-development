import { InstallButton } from '../pwa/install';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking, errorMessage } from '../api/pocketbase';
import { loadPurchases } from '../pwa/data';
import { checkConnection, useConnection } from '../pwa/connection';
import { SavedNotice } from '../components/OfflineState';
import { ErrorPanel, Loading } from '../components/Layout';
import { useResource } from '../hooks/useResource';
import { parseBookingSeats } from '../utils/bookingSeats';
import { plural } from '../utils/format';

export default function MyTicketsPage() {
  const online = useConnection(state => state.online);
  const offline = online === false;
  const loader = useCallback((signal: AbortSignal) => loadPurchases(signal, offline), [offline]);
  const { data, loading, error, reload } = useResource(loader);
  const [busy, setBusy] = useState('');
  const [cancelError, setCancelError] = useState('');
  async function handleDelete(id: string) {
    if (busy || online !== true || data?.fromCache || !confirm('Вы уверены, что хотите удалить этот билет?')) return;
    setBusy(id); setCancelError('');
    try { await cancelBooking(id); reload(); }
    catch (error) { setCancelError(errorMessage(error)); reload(); }
    finally { setBusy(''); }
  }
  if (loading) return <Loading />;
  if (error || !data) return <ErrorPanel message={error || 'Не удалось загрузить покупки.'} retry={() => { void checkConnection().then(reload); }} />;
  const bookings = data.data;
  return (
    <div className="min-h-screen">
      {/* Навигация */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            КИНО<span className="text-[var(--accent)]">.</span>
          </Link>
          <div className="flex items-center gap-4">
            <InstallButton />
            <Link
              to="/"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              На главную
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="mb-10 animate-fade-up">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Мои билеты</h1>
          <p className="text-[var(--text-muted)]">
            {bookings.length} {plural(bookings.length, ['покупка', 'покупки', 'покупок'])}
          </p>
        </div>

        {cancelError && <p role="alert" className="mb-6 text-[var(--accent)]">{cancelError}</p>}
        <SavedNotice savedAt={data.savedAt} kind={data.fromCache ? 'purchases' : undefined} warning={data.storageWarning} />

        {bookings.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <div className="text-6xl mb-4">🎟️</div>
            <p className="text-xl text-[var(--text-muted)] mb-6">
              У вас пока нет купленных билетов
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Выбрать фильм
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking, index) => {
              const seats = parseBookingSeats(booking.seats);
              return (
                <div
                  key={booking.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 animate-fade-up relative group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Кнопка удаления */}
                  {online === true && !data.fromCache && <button
                    disabled={busy !== ''}
                    onClick={() => handleDelete(booking.id)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Удалить билет"
                  >
                    ✕
                  </button>}

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 pr-8">
                        {booking.movieTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span>
                          📅{' '}
                          {new Date(booking.sessionDate).toLocaleDateString(
                            'ru-RU',
                            {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            }
                          )}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
                        <span>🕐 {booking.sessionTime}</span>
                        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
                        <span>{booking.sessionFormat}</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <span className="text-[var(--text-muted)]">Места: </span>
                        <span className="font-medium">
                          {seats
                            .map((s) => `Ряд ${s.row}, Место ${s.seat}`)
                            .join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      <div className="text-2xl font-bold text-[var(--text)]">
                        {booking.totalPrice} ₽
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Куплено{' '}
                        {new Date(booking.purchaseDate).toLocaleDateString(
                          'ru-RU'
                        )}
                      </div>
                    </div>
                  </div>

                  {!data.fromCache && <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm text-[var(--text-muted)]">
                    <div>
                      <span className="text-[var(--text-muted)]">Покупатель: </span>
                      <span className="text-[var(--text)]">{booking.customerName}</span>
                    </div>
                    <div>
                      <span>{booking.customerEmail}</span>
                    </div>
                  </div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Футер */}
      <footer className="border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">КИНО. © 2026</p>
          <Link to="/notifications" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Уведомления</Link>
        </div>
      </footer>
    </div>
  );
}
