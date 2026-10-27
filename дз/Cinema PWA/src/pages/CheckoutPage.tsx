import { InstallButton } from '../pwa/install';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ClientResponseError } from 'pocketbase';
import { Link, useNavigate } from 'react-router-dom';
import { checkoutItems, errorMessage, getQuote, placeOrder, recoverOrder } from '../api/pocketbase';
import { useResource } from '../hooks/useResource';
import { useCartStore } from '../store/cartStore';
import { fingerprint } from '../utils/fingerprint';
import type { Customer } from '../types';

export default function CheckoutPage() {
  const cart = useCartStore();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer>({ name: '', email: '', phone: '' });
  const [promoDraft, setPromoDraft] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [processing, setProcessing] = useState(false);
  const sending = useRef(false);
  const [savedAttempt] = useState(() => cart.attempt);
  const clearCart = cart.clearCart;
  useEffect(() => {
    if (!savedAttempt) return;
    const controller = new AbortController();
    void recoverOrder(savedAttempt.id, controller.signal).then(result => {
      if (!controller.signal.aborted && result.bookings.length) { clearCart(); navigate('/my-tickets', { replace: true }); }
    }).catch(() => { /* Незавершённую попытку можно повторить с той же корзиной. */ });
    return () => controller.abort();
  }, [savedAttempt, clearCart, navigate]);
  const loader = useCallback((signal: AbortSignal) => cart.items.length ? getQuote(checkoutItems(cart.items), promoCode, signal) : Promise.resolve(null), [cart.items, promoCode]);
  const { data: quote, loading, error: quoteError, reload } = useResource(loader);
  const ticketCount = cart.items.reduce((sum, item) => sum + item.seats.length, 0);
  function applyPromo() {
    const code = promoDraft.trim().toUpperCase();
    setPromoError(''); setOrderError('');
    if (code && code !== 'CINEMA10' && code !== 'WELCOME') {
      setPromoCode(''); setPromoError('Промокод недействителен.'); return;
    }
    setPromoCode(code);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !quote || loading || quoteError) return;
    sending.current = true; setProcessing(true); setOrderError('');
    const items = checkoutItems(cart.items);
    const normalizedCustomer = { name: customer.name.trim(), email: customer.email.trim().toLowerCase(), phone: customer.phone.trim() };
    try {
      const signature = await fingerprint(JSON.stringify({ items, promoCode, customer: normalizedCustomer }));
      const requestId = cart.getAttempt(signature);
      await placeOrder(items, promoCode, normalizedCustomer, quote.totalPrice, requestId);
      cart.clearCart();
      navigate('/my-tickets', { replace: true });
    } catch (error) {
      setOrderError(errorMessage(error));
      // При потере ответа оставляем расчёт и номер попытки для безопасного повтора.
      if (error instanceof ClientResponseError && error.status > 0) reload();
    } finally { sending.current = false; setProcessing(false); }
  }
  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold mb-4">Корзина пуста</p>
          <Link to="/" className="text-[var(--accent)] hover:underline">
            ← На главную
          </Link>
        </div>
      </div>
    );
  }

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

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="mb-10 animate-fade-up">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Оформление</h1>
          <p className="text-[var(--text-muted)]">Проверьте данные и завершите покупку</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Левая колонка — билеты */}
          <div className="lg:col-span-3 space-y-6 animate-fade-up">
            <h2 className="text-xl font-bold mb-4">Ваши билеты</h2>

            {cart.items.map((item, index) => (
              <div
                key={item.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 relative group"
              >
                <button
                  disabled={processing}
                  onClick={() => cart.removeItem(item.id)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  title="Удалить билет"
                >
                  ✕
                </button>

                <div className="flex gap-4">
                  <img
                    src={item.movie.poster}
                    alt={item.movie.title}
                    className="w-20 h-28 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-2 truncate pr-8">
                      {item.movie.title}
                    </h3>
                    <div className="space-y-1 text-sm text-[var(--text-muted)]">
                      <p>
                        {' '}
                        {new Date(item.session.date).toLocaleDateString('ru-RU', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      <p>
                         {item.session.time} • {item.session.format}
                      </p>
                      <p>
                        💺{' '}
                        {item.seats
                          .map((s) => `Ряд ${s.row}, Место ${s.seat}`)
                          .join(', ')}
                      </p>
                    </div>
                    <p className="mt-3 font-bold text-lg text-[var(--text)]">
                      {quote?.items[index]?.subtotal ?? item.totalPrice} ₽
                    </p>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => navigate(`/booking/${item.movie.id}/${item.session.id}`)}
                      className="mt-3 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
                    >
                      ← Изменить места
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {cart.items.length > 1 && (
              <button
                disabled={processing}
                onClick={cart.clearCart}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-2"
              >
                🗑️ Очистить корзину
              </button>
            )}

            {/* Промокод */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="font-bold mb-4">Промокод</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  aria-label="Промокод"
                  disabled={processing}
                  value={promoDraft}
                  onChange={(e) => {
                    setPromoDraft(e.target.value.toUpperCase());
                    setPromoError('');
                    setPromoCode('');
                  }}
                  placeholder="Введите код"
                  className="flex-1 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
                />
                <button
                  disabled={processing}
                  onClick={applyPromo}
                  className="px-6 py-3 bg-[var(--surface-hover)] hover:bg-[var(--border)] rounded-lg text-sm font-medium transition-colors"
                >
                  Применить
                </button>
              </div>
              {quote && quote.discountPercent > 0 && (
                <p className="mt-3 text-sm text-green-400">
                  ✓ Скидка {quote.discountPercent}% применена
                </p>
              )}
              {promoError && (
                <p className="mt-3 text-sm text-[var(--accent)]">{promoError}</p>
              )}
            </div>
          </div>

          {/* Правая колонка — форма и итог */}
          <div className="lg:col-span-2 space-y-6 animate-fade-up">
            {/* Итого */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sticky top-24">
              <h3 className="font-bold mb-4">Итого</h3>

              <div className="space-y-3 mb-6 pb-6 border-b border-[var(--border)]">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Билетов:</span>
                  <span>{ticketCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Сумма:</span>
                  <span>{quote ? `${quote.subtotal} ₽` : '—'}</span>
                </div>
                {quote && quote.discountPercent > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Скидка ({quote.discountPercent}%):</span>
                    <span>-{quote.discountAmount} ₽</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-[var(--text-muted)]">К оплате:</span>
                <span className="text-2xl font-bold">{quote ? `${quote.totalPrice} ₽` : '—'}</span>
              </div>

              {quoteError && <div role="alert" className="text-sm text-[var(--accent)] mb-4"><p>{quoteError}</p><button onClick={reload} className="underline mt-2">Повторить</button></div>}
              {orderError && <p role="alert" className="text-sm text-[var(--accent)] mb-4">{orderError}</p>}

              {/* Форма */}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label htmlFor="customer-name" className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                    Имя
                  </label>
                  <input
                    type="text"
                    required
                    id="customer-name"
                    autoComplete="name"
                    disabled={processing}
                    value={customer.name}
                    onChange={(e) =>
                      setCustomer({ ...customer, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="customer-email" className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    id="customer-email"
                    autoComplete="email"
                    disabled={processing}
                    value={customer.email}
                    onChange={(e) =>
                      setCustomer({ ...customer, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="customer-phone" className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    required
                    id="customer-phone"
                    autoComplete="tel"
                    disabled={processing}
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer({ ...customer, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing || loading || !quote || !!quoteError}
                  className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg shadow-[var(--accent)]/20"
                >
                  {processing ? 'Оформление...' : quote ? `Оплатить ${quote.totalPrice} ₽` : 'Оплатить'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
