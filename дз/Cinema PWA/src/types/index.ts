export interface Movie {
  id: string; title: string; poster: string; backdrop?: string; overview?: string;
  rating: number; genres?: string[]; ageRating?: string; duration: number;
  releaseDate?: string; director?: string; cast?: string[];
}
export interface Session {
  id: string; movieId: string; date: string; time: string; format: string;
  hallId: string; price: number; isArchived: boolean;
}
export interface Hall {
  id: string; name: string; cinemaId: string; rows: number; seatsPerRow: number; vipRows: number[];
}
export interface Cinema {
  id: string; name: string; address: string; phone: string; metro: string; workingHours: string;
}
export interface BookedSeat { row: number; seat: number }
export interface Seat extends BookedSeat { isOccupied: boolean; isVip: boolean; price: number }
export interface CartItem {
  id: string; movie: Movie; session: Session; seats: Seat[]; totalPrice: number;
}
export interface QuoteItem {
  sessionId: string; movieId: string; movieTitle: string; sessionDate: string;
  sessionTime: string; sessionFormat: string; hallName: string; seats: BookedSeat[];
  subtotal: number; totalPrice: number; discountPercent: number;
}
export interface Quote {
  ticketCount: number; subtotal: number; totalPrice: number; discountAmount: number;
  discountPercent: number; promoCode: string; items: QuoteItem[];
}
export interface Booking extends QuoteItem {
  id: string; customerName: string; customerEmail: string; purchaseDate: string;
}
export interface Customer { name: string; email: string; phone: string }
export interface CheckoutItem { sessionId: string; seats: BookedSeat[] }
