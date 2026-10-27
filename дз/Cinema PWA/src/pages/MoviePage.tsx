import { InstallButton } from '../pwa/install';
import { loadCatalog } from '../pwa/data';
import { checkConnection, requestOnline, useConnection } from '../pwa/connection';
import { ConnectionRequired, SavedNotice } from '../components/OfflineState';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pb } from '../api/pocketbase';
import { useNow, useResource } from '../hooks/useResource';
import { Loading, ErrorPanel } from '../components/Layout';
import { sessionTime, year } from '../utils/format';
import type { Cinema, Hall, Session } from '../types';

function MovieDetails({ id }: { id: string }) {
  const online = useConnection(state => state.online);
  const offline = online === false;
  const catalogLoader = useCallback((signal: AbortSignal) => loadCatalog(signal, offline), [offline]);
  const catalog = useResource(catalogLoader);
  const liveLoader = useCallback(async (signal: AbortSignal) => {
    if (online !== true) return null;
    return requestOnline(async requestSignal => {
      const [sessions, halls, cinemas] = await Promise.all([
        pb.collection('sessions').getFullList<Session>({ filter: pb.filter('movieId = {:id}', { id }), sort: 'date,time', signal: requestSignal }),
        pb.collection('halls').getFullList<Hall>({ signal: requestSignal }),
        pb.collection('cinemas').getFullList<Cinema>({ signal: requestSignal }),
      ]);
      return { sessions, halls, cinemas };
    }, signal);
  }, [id, online]);
  const live = useResource(liveLoader);
  const [date, setDate] = useState('');
  const [format, setFormat] = useState('Все');
  const now = useNow();
  const movie = catalog.data?.data.find(item => item.id === id);
  if (catalog.loading) return <Loading />;
  if (catalog.error || !movie) return <ErrorPanel message={catalog.error || 'Фильм не найден.'} retry={() => { void checkConnection().then(catalog.reload); }} />;
  const halls = live.data?.halls || [];
  const cinemas = live.data?.cinemas || [];
  const sessions = (live.data?.sessions || []).filter(session => sessionTime(session) > now && halls.some(hall => hall.id === session.hallId));
  const dates = [...new Set(sessions.map(session => session.date))].sort();
  const formats = ['Все', ...Array.from(new Set(sessions.map(session => session.format))).sort()];
  const selectedDate = dates.includes(date) ? date : dates[0];
  const selectedFormat = formats.includes(format) ? format : 'Все';
  const filtered = sessions.filter(session => session.date === selectedDate && (selectedFormat === 'Все' || session.format === selectedFormat));
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
              to="/my-tickets" 
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Мои билеты
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero с backdrop */}
      <section className="relative h-[70vh] overflow-hidden">
        <img
          src={movie.backdrop || movie.poster}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-transparent"></div>
        
        <div className="relative h-full max-w-7xl mx-auto px-6 flex items-end pb-12">
          <div className="animate-fade-up">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] text-sm mb-6 transition-colors"
            >
              ← Назад
            </Link>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 leading-none">
              {movie.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">★</span> 
                <span className="font-semibold">{movie.rating}</span>
              </span>
              <span className="text-[var(--text-muted)]">{movie.ageRating}</span>
              <span className="text-[var(--text-muted)]">{movie.duration} мин</span>
              <span className="text-[var(--text-muted)]">
                {year(movie.releaseDate)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Контент */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Постер */}
          <div className="animate-fade-up">
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>

          {/* Информация */}
          <div className="md:col-span-2 space-y-10 animate-fade-up">
            {catalog.data && <SavedNotice savedAt={catalog.data.savedAt} kind={catalog.data.fromCache ? 'catalog' : undefined} warning={catalog.data.storageWarning} />}

            {/* Описание */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Описание</h2>
              <p className="text-[var(--text-muted)] leading-relaxed text-lg">
                {movie.overview}
              </p>
            </div>

            {/* Жанры */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Жанры</h2>
              <div className="flex flex-wrap gap-2">
                {movie.genres?.map((genre) => (
                  <span 
                    key={genre} 
                    className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Режиссёр и актёры */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-[var(--text-muted)] text-sm mb-2">Режиссёр</h3>
                <p className="font-semibold">{movie.director}</p>
              </div>
              <div>
                <h3 className="text-[var(--text-muted)] text-sm mb-2">В ролях</h3>
                <p className="font-semibold">{movie.cast?.join(', ')}</p>
              </div>
            </div>

            {/* Расписание сеансов */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Расписание сеансов</h2>

              {online !== true ? <ConnectionRequired message="Расписание и выбор мест доступны при соединении с сервером." /> : live.loading ? <p role="status" className="text-[var(--text-muted)] py-6">Загрузка сеансов…</p> : live.error ? <ErrorPanel message={live.error} retry={live.reload} /> : sessions.length === 0 ? (
                <p className="text-[var(--text-muted)] text-center py-12">
                  Нет доступных сеансов
                </p>
              ) : (
                <>
                  {/* Даты */}
                  <div className="mb-6">
                    <h3 className="text-[var(--text-muted)] text-sm mb-3">Дата</h3>
                    <div className="flex flex-wrap gap-2">
                      {dates.map((date) => (
                        <button
                          key={date}
                          onClick={() => setDate(date)}
                          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedDate === date
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          {new Date(date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            weekday: 'short',
                          })}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Форматы */}
                  <div className="mb-8">
                    <h3 className="text-[var(--text-muted)] text-sm mb-3">Формат</h3>
                    <div className="flex flex-wrap gap-2">
                      {formats.map((format) => (
                        <button
                          key={format}
                          onClick={() => setFormat(format)}
                          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedFormat === format
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Сеансы */}
                  {filtered.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-center py-12">
                      Нет сеансов на выбранную дату
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {filtered.map((session) => (
                        <Link
                          key={session.id}
                          title={[cinemas.find(cinema => cinema.id === halls.find(hall => hall.id === session.hallId)?.cinemaId)?.name, halls.find(hall => hall.id === session.hallId)?.name].filter(Boolean).join(" · ")}
                          to={`/booking/${movie.id}/${session.id}`}
                          className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-lg p-4 transition-colors text-center group"
                        >
                          <div className="text-xl font-bold mb-1 group-hover:text-[var(--accent)] transition-colors">
                            {session.time}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {session.format} • {session.price} ₽
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Футер */}
      <footer className="border-t border-[var(--border)] mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            КИНО. © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
export default function MoviePage() {
  const { id } = useParams();
  return id ? <MovieDetails key={id} id={id} /> : <ErrorPanel message="Фильм не указан." />;
}
