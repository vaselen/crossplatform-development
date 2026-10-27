import { pb, getBookings } from '../api/pocketbase.ts';
import { isUnavailable, requestOnline } from './connection.ts';
import { browserKey } from './identity.ts';
import { readCatalog, writeCatalog, readPurchases, writePurchases, type ResourceCopy } from './storage.ts';
import type { Movie, Booking } from '../types';

async function savedCatalog(): Promise<ResourceCopy<Movie[]>> {
  const snapshot = await readCatalog().catch(() => undefined);
  if (!snapshot) throw new Error('Афиша ещё не сохранена. Откройте её при доступном сервере.');
  return { ...snapshot, fromCache: true };
}
export async function loadCatalog(signal?: AbortSignal, preferSaved = false): Promise<ResourceCopy<Movie[]>> {
  if (preferSaved) return savedCatalog();
  let movies: Movie[];
  try {
    movies = await requestOnline(requestSignal => pb.collection('movies').getFullList<Movie>({ sort: '-created', signal: requestSignal }), signal);
  } catch (error) {
    if (signal?.aborted || !isUnavailable(error)) throw error;
    return savedCatalog();
  }
  if (signal?.aborted) throw new DOMException('Запрос отменён', 'AbortError');
  try {
    const saved = await writeCatalog(movies);
    return { ...saved, data: movies, fromCache: false };
  } catch {
    return { data: movies, savedAt: new Date().toISOString(), fromCache: false, storageWarning: 'Не удалось сохранить афишу для просмотра без сети.' };
  }
}

async function savedPurchases(key: string): Promise<ResourceCopy<Booking[]>> {
  const snapshot = await readPurchases(key).catch(() => undefined);
  if (!snapshot) throw new Error('Нет проверенной сохранённой истории. Откройте «Мои билеты» при доступном сервере.');
  return { ...snapshot, fromCache: true };
}
export async function loadPurchases(signal?: AbortSignal, preferSaved = false): Promise<ResourceCopy<Booking[]>> {
  const key = browserKey();
  if (preferSaved) return savedPurchases(key);
  let bookings: Booking[];
  try { bookings = await getBookings(signal); }
  catch (error) {
    if (signal?.aborted || !isUnavailable(error)) throw error;
    return savedPurchases(key);
  }
  if (signal?.aborted) throw new DOMException('Запрос отменён', 'AbortError');
  try {
    const saved = await writePurchases(key, bookings);
    return { ...saved, data: bookings, fromCache: false };
  } catch {
    return { data: bookings, savedAt: new Date().toISOString(), fromCache: false, storageWarning: 'Не удалось сохранить билеты для просмотра без сети.' };
  }
}
