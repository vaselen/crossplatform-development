import { InstallButton } from '../pwa/install';
import { requestOnline } from '../pwa/connection';
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAvailability, pb } from '../api/pocketbase';
import { useNow, useResource } from '../hooks/useResource';
import { ErrorPanel, Loading } from '../components/Layout';
import { useCartStore } from '../store/cartStore';
import { plural, sessionTime } from '../utils/format';
import type { BookedSeat, Cinema, Hall, Movie, Seat, Session } from '../types';

interface SelectionData { movie: Movie; session: Session; hall: Hall; cinema: Cinema; occupied: BookedSeat[] }
function SeatSelector({ data }: { data: SelectionData }) {
  const { movie, session, hall, cinema } = data;
  const cart = useCartStore();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<BookedSeat[]>(() => cart.items.find(item => item.session.id === session.id)?.seats || []);
  const occupied = data.occupied;
  const now = useNow();
  const busy = new Set(occupied.map(seat => `${seat.row}-${seat.seat}`));
  const seats: Seat[][] = Array.from({ length: hall.rows }, (_, rowIndex) => Array.from({ length: hall.seatsPerRow }, (_, seatIndex) => {
    const row = rowIndex + 1; const seat = seatIndex + 1; const isVip = (hall.vipRows || []).includes(row);
    return { row, seat, isVip, isOccupied: busy.has(`${row}-${seat}`), price: session.price + (isVip ? 200 : 0) };
  }));
  const selectedSeats = seats.flat().filter(seat => !seat.isOccupied && selected.some(item => item.row === seat.row && item.seat === seat.seat));
  const expired = sessionTime(session) <= now;
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  function handleSeatClick(seat: Seat) {
    if (seat.isOccupied || expired) return;
    setSelected(previous => {
      const active = previous.filter(item => !busy.has(`${item.row}-${item.seat}`));
      return active.some(item => item.row === seat.row && item.seat === seat.seat)
        ? active.filter(item => item.row !== seat.row || item.seat !== seat.seat)
        : active.length < 50 ? [...active, { row: seat.row, seat: seat.seat }] : active;
    });
  }
  function handleCheckout() {
    if (!selectedSeats.length || expired) return;
    cart.addItem({ movie, session, seats: selectedSeats, totalPrice });
    navigate('/checkout');
  }
  return (
    <div className="min-h-screen pb-32">
      {/* Навигация */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to={`/movie/${movie.id}`}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-2"
          >
            ← Назад к фильму
          </Link>
          <div className="flex items-center gap-4">
            <InstallButton />
            <Link
              to="/my-tickets"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Мои билеты
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-24 py-8">
        {/* Заголовок сеанса */}
        <div className="mb-10 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            {movie.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-[var(--text-muted)]">
            <span>
              {new Date(session.date).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
            <span className="text-[var(--text)] font-medium">{session.time}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
            <span>{session.format}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
            <span>{hall.name}</span>
          </div>
          {cinema && (
            <p className="mt-2 text-sm text-[var(--text-muted)] flex items-center gap-2">
              📍 {cinema.address} (м. {cinema.metro})
            </p>
          )}
        </div>

        {expired && <ErrorPanel message="Этот сеанс уже начался. Выберите другой сеанс." />}

        {/* Легенда */}
        <div className="flex flex-wrap gap-6 mb-10 justify-center md:justify-start animate-fade-up">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--surface)] border-2 border-[var(--border)]"></div>
            <span className="text-sm text-[var(--text-muted)]">Свободно</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--accent)] border-2 border-[var(--accent)]"></div>
            <span className="text-sm text-[var(--text-muted)]">Выбрано</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--surface)] border-2 border-red-500/60"></div>
            <span className="text-sm text-[var(--text-muted)]">Занято</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--surface)] border-2 border-yellow-500/60"></div>
            <span className="text-sm text-[var(--text-muted)]">VIP</span>
          </div>
        </div>

        {/* Схема зала */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 md:p-10 mb-8 overflow-x-auto animate-fade-up">
          <div className="text-center mb-10">
            <div className="inline-block w-2/3 h-2 bg-gradient-to-b from-[var(--text-muted)] to-transparent rounded-full opacity-30"></div>
            <p className="text-xs text-[var(--text-muted)] mt-3 uppercase tracking-widest">
              Экран
            </p>
          </div>

          <div className="space-y-3 min-w-[500px]">
            {seats.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)] w-6 text-right font-mono">
                  {row[0]?.row}
                </span>
                <div className="flex gap-2 flex-1 justify-center">
                  {row.map((seat) => {
                    const isSelected = selectedSeats.some(
                      (s) => s.row === seat.row && s.seat === seat.seat
                    );

                    const baseClasses =
                      'w-7 h-7 md:w-8 md:h-8 rounded text-[10px] md:text-xs font-medium flex items-center justify-center transition-all duration-200';
                    let stateClasses = '';

                    if (seat.isOccupied) {
                      stateClasses =
                        'bg-[var(--surface)] border-2 border-red-500/60 text-[var(--text-muted)]/40 cursor-not-allowed';
                    } else if (isSelected) {
                      stateClasses =
                        'bg-[var(--accent)] border-2 border-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20 scale-110';
                    } else if (seat.isVip) {
                      stateClasses =
                        'bg-[var(--surface)] border-2 border-yellow-500/60 text-yellow-500/80 hover:border-yellow-500 hover:bg-yellow-500/10 cursor-pointer';
                    } else {
                      stateClasses =
                        'bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer';
                    }

                    return (
                      <button
                        key={`${seat.row}-${seat.seat}`}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.isOccupied || expired}
                        aria-pressed={isSelected}
                        className={`${baseClasses} ${stateClasses}`}
                        title={
                          seat.isOccupied
                            ? `Ряд ${seat.row}, Место ${seat.seat} — занято`
                            : `Ряд ${seat.row}, Место ${seat.seat} • ${seat.price} ₽`
                        }
                      >
                        {seat.seat}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky панель итогов */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] backdrop-blur-xl z-40 animate-fade-up">
          <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-[var(--text-muted)] mb-1">
                Выбрано {selectedSeats.length}{' '}
                {plural(selectedSeats.length, ['место', 'места', 'мест'])}
              </p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {totalPrice} ₽
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 truncate max-w-[250px] md:max-w-md">
                {selectedSeats
                  .map((s) => `Ряд ${s.row}, Место ${s.seat}`)
                  .join(', ')}
              </p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={expired}
              className="w-full md:w-auto px-8 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-semibold transition-colors shadow-lg shadow-[var(--accent)]/20"
            >
              Оформить билеты
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function BookingDetails({ movieId, sessionId }: { movieId: string; sessionId: string }) {
  const loader = useCallback((signal: AbortSignal): Promise<SelectionData> => requestOnline(async requestSignal => {
    const [movie, session] = await Promise.all([pb.collection('movies').getOne<Movie>(movieId, { signal: requestSignal }), pb.collection('sessions').getOne<Session>(sessionId, { signal: requestSignal })]);
    if (session.movieId !== movie.id) throw new Error('Этот сеанс относится к другому фильму. Откройте расписание заново.');
    const hall = await pb.collection('halls').getOne<Hall>(session.hallId, { signal: requestSignal });
    if (!Number.isInteger(hall.rows) || hall.rows < 1 || hall.rows > 40 || !Number.isInteger(hall.seatsPerRow) || hall.seatsPerRow < 1 || hall.seatsPerRow > 50) throw new Error('Схема зала настроена неверно. Выберите другой сеанс.');
    const [cinema, availability] = await Promise.all([pb.collection('cinemas').getOne<Cinema>(hall.cinemaId, { signal: requestSignal }), getAvailability(sessionId, requestSignal)]);
    return { movie, session, hall, cinema, occupied: availability.occupied };
  }, signal), [movieId, sessionId]);
  const { data, loading, error, reload } = useResource(loader);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorPanel message={error || 'Сеанс не найден.'} retry={reload} />;
  return <SeatSelector key={sessionId} data={data} />;
}
export default function BookingPage() {
  const { movieId, sessionId } = useParams();
  return movieId && sessionId ? <BookingDetails key={`${movieId}:${sessionId}`} movieId={movieId} sessionId={sessionId} /> : <ErrorPanel message="Сеанс не указан." />;
}
