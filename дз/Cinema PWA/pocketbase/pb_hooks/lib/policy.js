// Чистые правила: используются сервером и проверяются без запуска базы.
const MOSCOW_OFFSET = '+03:00';

function fail(message) { throw new Error(message); }

function normalizePromo(value) { return String(value || '').trim().toUpperCase(); }

function discountFor(value) {
  const code = normalizePromo(value);
  if (!code) return 0;
  if (code === 'CINEMA10') return 10;
  if (code === 'WELCOME') return 15;
  return fail('Промокод недействителен.');
}

function startTime(session) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(session.time)) return NaN;
  const value = Date.parse(session.date + 'T' + session.time + ':00' + MOSCOW_OFFSET);
  if (!Number.isFinite(value)) return NaN;
  const day = new Date(value + 3 * 3600000).toISOString().slice(0, 10);
  return day === session.date ? value : NaN;
}

function seatsFor(value, hall) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) return fail('Выберите от 1 до 50 мест.');
  const used = {};
  return value.map(function (seat) {
    if (!seat || !Number.isInteger(seat.row) || !Number.isInteger(seat.seat) ||
        seat.row < 1 || seat.row > hall.rows || seat.seat < 1 || seat.seat > hall.seatsPerRow) {
      return fail('Выбрано несуществующее место. Обновите схему зала.');
    }
    const key = seat.row + '-' + seat.seat;
    if (used[key]) return fail('Одно место добавлено несколько раз.');
    used[key] = true;
    return { row: seat.row, seat: seat.seat };
  }).sort(function (a, b) { return a.row - b.row || a.seat - b.seat; });
}

function subtotalFor(seats, hall, session) {
  const base = Math.round(Number(session.price) * 100);
  if (!Number.isFinite(base) || base <= 0) return fail('Для сеанса не задана корректная цена.');
  return seats.reduce(function (total, seat) {
    return total + base + ((hall.vipRows || []).indexOf(seat.row) >= 0 ? 20000 : 0);
  }, 0);
}

// Распределение округления гарантирует, что сумма билетов равна итогу заказа.
function allocateTotals(subtotals, percent) {
  const exact = subtotals.map(function (amount) { return amount * (100 - percent) / 100; });
  const result = exact.map(Math.floor);
  const target = Math.round(subtotals.reduce(function (a, b) { return a + b; }, 0) * (100 - percent) / 100);
  const order = exact.map(function (n, i) { return { i: i, remainder: n - Math.floor(n) }; })
    .sort(function (a, b) { return b.remainder - a.remainder || a.i - b.i; });
  const rest = target - result.reduce(function (a, b) { return a + b; }, 0);
  for (let i = 0; i < rest; i++) result[order[i].i]++;
  return result;
}

function customerFor(value) {
  const data = value || {};
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const phone = String(data.phone || '').trim();
  if (name.length < 2 || name.length > 100) return fail('Введите имя длиной от 2 до 100 символов.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Введите корректный email.');
  if (!/^[+\d\s()-]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7) return fail('Введите корректный телефон.');
  return { name: name, email: email, phone: phone };
}

function dayInMoscow(now) { return new Date(now + 3 * 3600000).toISOString().slice(0, 10); }

module.exports = { normalizePromo, discountFor, startTime, seatsFor, subtotalFor, allocateTotals, customerFor, dayInMoscow };
