import type { BookedSeat } from '../types';

export function parseBookingSeats(value: unknown): BookedSeat[] {
  let seats = value;

  if (typeof seats === 'string') {
    try {
      seats = JSON.parse(seats);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(seats)) return [];

  return seats.filter(
    (seat): seat is BookedSeat =>
      typeof seat === 'object' &&
      seat !== null &&
      Number.isInteger(seat.row) &&
      seat.row > 0 &&
      Number.isInteger(seat.seat) &&
      seat.seat > 0
  );
}
