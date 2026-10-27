import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem } from '../types';

interface Attempt { signature: string; id: string }
interface CartState {
  items: CartItem[]; attempt: Attempt | null;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getAttempt: (signature: string) => string;
}
function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return typeof item.id === 'string' && typeof item.movie?.id === 'string' && typeof item.session?.id === 'string' &&
    Array.isArray(item.seats) && item.seats.length > 0 && item.seats.every(seat => seat &&
      Number.isInteger(seat.row) && seat.row > 0 && Number.isInteger(seat.seat) && seat.seat > 0 && Number.isFinite(seat.price)) && Number.isFinite(item.totalPrice);
}
export const useCartStore = create<CartState>()(persist((set, get) => ({
  items: [], attempt: null,
  addItem: item => set(state => {
    const existing = state.items.find(entry => entry.session.id === item.session.id);
    const next: CartItem = { ...item, id: existing?.id || crypto.randomUUID() };
    return { items: [...state.items.filter(entry => entry.session.id !== item.session.id), next], attempt: null };
  }),
  removeItem: id => set(state => ({ items: state.items.filter(item => item.id !== id), attempt: null })),
  clearCart: () => set({ items: [], attempt: null }),
  getAttempt: signature => {
    const saved = get().attempt;
    if (saved?.signature === signature) return saved.id;
    const id = crypto.randomUUID(); set({ attempt: { signature, id } }); return id;
  },
}), {
  name: 'cinema-pwa-cart-v1', storage: createJSONStorage(() => localStorage),
  partialize: state => ({ items: state.items, attempt: state.attempt }),
  merge: (persisted, current) => {
    const saved = persisted && typeof persisted === 'object' ? persisted as Partial<CartState> : {};
    const attempt = saved.attempt;
    return { ...current, items: Array.isArray(saved.items) ? saved.items.filter(isCartItem) : [],
      attempt: attempt && typeof attempt.id === 'string' && typeof attempt.signature === 'string' ? attempt : null };
  },
}));
