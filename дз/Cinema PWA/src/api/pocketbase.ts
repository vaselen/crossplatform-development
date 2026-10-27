import PocketBase, { ClientResponseError } from 'pocketbase';
import type { Booking, CheckoutItem, Customer, Quote, BookedSeat } from '../types';
import { requestOnline } from '../pwa/connection.ts';
import { browserKey } from '../pwa/identity.ts';
import { invalidatePurchases, mergePurchases } from '../pwa/storage.ts';

export const pb = new PocketBase(import.meta.env?.VITE_POCKETBASE_URL || window.location.origin);
pb.autoCancellation(false);
pb.beforeSend = (url, options) => ({ url, options: { ...options, cache: 'no-store' } });
export function errorMessage(error: unknown) {
  if (error instanceof ClientResponseError) {
    if (!error.status) return 'Нет связи с сервером. Проверьте соединение и повторите попытку.';
    if (error.status >= 500) return 'Сервер не смог выполнить запрос. Попробуйте ещё раз.';
    if (error.response?.message) return String(error.response.message);
  }
  return error instanceof Error ? error.message : 'Не удалось выполнить действие.';
}
//Передать серверу идентификаторы сеансов и координаты мест
export const checkoutItems = (items: { session: { id: string }; seats: BookedSeat[] }[]): CheckoutItem[] =>
  items.map(item => ({ sessionId: item.session.id, seats: item.seats.map(({ row, seat }) => ({ row, seat })) }));
//Получить занятые места без выгрузки чужих покупок
export function getAvailability(sessionId: string, signal?: AbortSignal) {
  return requestOnline(requestSignal => pb.send<{ occupied: BookedSeat[] }>(`/api/cinema/sessions/${encodeURIComponent(sessionId)}/seats`, { signal: requestSignal }), signal);
}
//Проверить выбор и рассчитать цену/скидку на сервере
export function getQuote(items: CheckoutItem[], promoCode: string, signal?: AbortSignal) {
  return requestOnline(requestSignal => pb.send<Quote>('/api/cinema/quote', { method: 'POST', body: { items, promoCode }, signal: requestSignal }), signal);
}
//Оформить покупку и занять места в одной операции
export async function placeOrder(items: CheckoutItem[], promoCode: string, customer: Customer, expectedTotal: number, requestId: string) {
  const key = browserKey();
  const result = await requestOnline(signal => pb.send<{ bookings: Booking[]; totalPrice: number }>('/api/cinema/checkout', {
    method: 'POST', headers: { 'X-Cinema-Client': key }, body: { items, promoCode, customer, expectedTotal, requestId }, signal,
  }));
  // Failure of optional offline storage must not turn a confirmed purchase into an error.
  await mergePurchases(key, result.bookings).catch(() => {});
  return result;
}
//Проверить результат оформления, если ответ потерялся
export function recoverOrder(requestId: string, signal?: AbortSignal) {
  return requestOnline(requestSignal => pb.send<{ bookings: Booking[] }>(`/api/cinema/checkout/${encodeURIComponent(requestId)}`, { headers: { 'X-Cinema-Client': browserKey() }, signal: requestSignal }), signal);
}
//Получить покупки по ключу текущего браузера
export async function getBookings(signal?: AbortSignal) {
  const result = await requestOnline(requestSignal => pb.send<{ items: Booking[] }>('/api/cinema/bookings', { headers: { 'X-Cinema-Client': browserKey() }, signal: requestSignal }), signal);
  return result.items;
}
//Отменить свою покупку и освободить места
export async function cancelBooking(id: string) {
  const key = browserKey();
  await invalidatePurchases(key);
  return requestOnline(signal => pb.send<void>(`/api/cinema/bookings/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Cinema-Client': key }, signal }));
}
