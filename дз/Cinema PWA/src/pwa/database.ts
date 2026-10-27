import { openDB, type DBSchema } from 'idb';
import type { Booking, Movie } from '../types';
import type { FeedbackMessage } from './feedback.ts';

export interface Saved<T> { data: T; savedAt: string }
interface CinemaDatabase extends DBSchema {
  catalog: { key: string; value: Saved<Movie[]> };
  purchases: { key: string; value: Saved<Booking[]> };
  feedback: { key: string; value: FeedbackMessage };
}

let opening: ReturnType<typeof openDB<CinemaDatabase>> | undefined;
export function database() {
  if (!opening) {
    opening = openDB<CinemaDatabase>('cinema-pwa-offline', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) { db.createObjectStore('catalog'); db.createObjectStore('purchases'); }
        if (oldVersion < 2) db.createObjectStore('feedback', { keyPath: 'requestId' });
      },
      blocking() { void opening?.then(db => db.close()); opening = undefined; },
      terminated() { opening = undefined; },
    }).catch(error => { opening = undefined; throw error; });
  }
  return opening;
}
