import { fingerprint } from '../utils/fingerprint.ts';
import type { Booking, Movie } from '../types';
import { database, type Saved } from './database.ts';

export interface ResourceCopy<T> extends Saved<T> { fromCache: boolean; storageWarning?: string }

export async function readCatalog() { return (await database()).get('catalog', 'current'); }
export async function writeCatalog(movies: Movie[]) {
  const snapshot: Saved<Movie[]> = { data: movies, savedAt: new Date().toISOString() };
  await (await database()).put('catalog', snapshot, 'current');
  return snapshot;
}

// Personal snapshots are separated by the browser identity. Contacts are not
// needed for offline presentation of a ticket and are not saved in IndexedDB.
export function offlineBooking(booking: Booking): Booking {
  return {
    id: booking.id, movieId: booking.movieId, movieTitle: booking.movieTitle,
    sessionId: booking.sessionId, sessionDate: booking.sessionDate,
    sessionTime: booking.sessionTime, sessionFormat: booking.sessionFormat,
    hallName: booking.hallName, seats: booking.seats.map(({ row, seat }) => ({ row, seat })),
    subtotal: booking.subtotal, totalPrice: booking.totalPrice,
    discountPercent: booking.discountPercent, purchaseDate: booking.purchaseDate,
    customerName: '', customerEmail: '',
  };
}

const invalidKey = (owner: string) => `cinema-pwa-purchases-unverified:${owner}`;
export async function invalidatePurchases(key: string) {
  const owner = await fingerprint(key);
  // Set before a cancellation: a lost response must not resurrect an old ticket.
  localStorage.setItem(invalidKey(owner), '1');
}
export async function readPurchases(key: string) {
  const owner = await fingerprint(key);
  if (localStorage.getItem(invalidKey(owner))) return undefined;
  return (await database()).get('purchases', owner);
}
export async function writePurchases(key: string, bookings: Booking[]) {
  const owner = await fingerprint(key);
  const snapshot: Saved<Booking[]> = { data: bookings.map(offlineBooking), savedAt: new Date().toISOString() };
  await (await database()).put('purchases', snapshot, owner);
  localStorage.removeItem(invalidKey(owner));
  return snapshot;
}
export async function mergePurchases(key: string, confirmed: Booking[]) {
  const snapshot = await readPurchases(key);
  // An unverified list following cancellation is restored only by a full GET.
  const owner = await fingerprint(key);
  if (localStorage.getItem(invalidKey(owner))) return;
  const ids = new Set(confirmed.map(item => item.id));
  await writePurchases(key, [...confirmed, ...(snapshot?.data || []).filter(item => !ids.has(item.id))]);
}
