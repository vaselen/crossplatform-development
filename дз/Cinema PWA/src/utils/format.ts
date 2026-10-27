import type { Session } from '../types';

export function sessionTime(session: Pick<Session, 'date' | 'time'>) { return Date.parse(`${session.date}T${session.time}:00+03:00`); }
export function year(date?: string) {
  const value = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isInteger(value) && value > 0 ? value : '—';
}
export function plural(value: number, forms: [string, string, string]) {
  const lastTwo = value % 100;
  return lastTwo >= 11 && lastTwo <= 14 ? forms[2] : value % 10 === 1 ? forms[0] : value % 10 >= 2 && value % 10 <= 4 ? forms[1] : forms[2];
}
