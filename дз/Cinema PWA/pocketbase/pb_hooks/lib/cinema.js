const policy = require('./policy.js');
function stop(message, status) { throw new ApiError(status || 400, message); }
function checked(fn) { try { return fn(); } catch (error) { stop(error.message || 'Проверьте введённые данные.'); } }
function jsonField(record, field) { try { return JSON.parse(record.getString(field) || 'null'); } catch { return null; } }
function records(app, collection, filter, params, sort) {
  return app.findRecordsByFilter(collection, filter || '', sort || '', 0, 0, params || {});
}
function get(app, collection, id, message) { try { return app.findRecordById(collection, id); } catch { stop(message, 404); } }
function ownerOf(e) {
  const key = e.request.header.get('X-Cinema-Client');
  if (!/^[a-f0-9]{64}$/.test(key)) stop('Не удалось определить историю этого браузера. Обновите страницу.', 401);
  return $security.sha256(key);
}
function receipt(record) {
  return {
    id: record.id, movieId: record.getString('movieId'), movieTitle: record.getString('movieTitle'),
    sessionId: record.getString('sessionId'), sessionDate: record.getString('sessionDate'),
    sessionTime: record.getString('sessionTime'), sessionFormat: record.getString('sessionFormat'),
    hallName: record.getString('hallName'), seats: jsonField(record, 'seats') || [],
    subtotal: record.getFloat('subtotal'), discountPercent: record.getInt('discountPercent'),
    totalPrice: record.getFloat('totalPrice'), customerName: record.getString('customerName'),
    customerEmail: record.getString('customerEmail'), purchaseDate: record.getString('purchaseDate'),
  };
}
// RequestInfo использует Go map: порядок его ключей не гарантирован.
// Для повтора строим обычные JS-объекты с явным порядком полей и мест.
function canonicalItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) stop('Корзина пуста или содержит слишком много сеансов.');
  return items.map(function (item) {
    if (!item || typeof item.sessionId !== 'string' || !Array.isArray(item.seats)) stop('В корзине найден некорректный сеанс.');
    const seats = item.seats.map(function (seat) {
      if (!seat || !Number.isInteger(seat.row) || !Number.isInteger(seat.seat)) stop('Некорректные координаты места.');
      return { row: seat.row, seat: seat.seat };
    }).sort(function (a, b) { return a.row - b.row || a.seat - b.seat; });
    return { sessionId: item.sessionId, seats: seats };
  }).sort(function (a, b) { return a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : 0; });
}
function quote(app, body) {
  const items = body.items;
  if (!Array.isArray(items) || !items.length || items.length > 20) stop('Корзина пуста или содержит слишком много сеансов.');
  const percent = checked(function () { return policy.discountFor(body.promoCode); });
  const already = {};
  let ticketCount = 0;
  const normalized = items.map(function (item) {
    if (!item || typeof item.sessionId !== 'string') stop('В корзине найден некорректный сеанс.');
    const session = get(app, 'sessions', item.sessionId, 'Сеанс больше не существует. Выберите другой.');
    const sessionData = { date: session.getString('date'), time: session.getString('time'), price: session.getFloat('price') };
    const start = policy.startTime(sessionData);
    if (session.getBool('isArchived') || !Number.isFinite(start) || start <= Date.now()) stop('Сеанс уже начался или недоступен. Выберите другой.', 409);
    const movie = get(app, 'movies', session.getString('movieId'), 'Фильм не найден.');
    const hall = get(app, 'halls', session.getString('hallId'), 'Зал не найден.');
    const hallData = { rows: hall.getInt('rows'), seatsPerRow: hall.getInt('seatsPerRow'), vipRows: jsonField(hall, 'vipRows') || [] };
    const seats = checked(function () { return policy.seatsFor(item.seats, hallData); });
    ticketCount += seats.length;
    if (ticketCount > 50) stop('За одно оформление можно выбрать не более 50 мест.');
    const busy = {};
    records(app, 'seat_reservations', 'sessionId = {:id}', { id: session.id }).forEach(function (seat) { busy[seat.getInt('row') + '-' + seat.getInt('seat')] = true; });
    seats.forEach(function (seat) {
      const position = seat.row + '-' + seat.seat;
      const key = session.id + ':' + position;
      if (already[key]) stop('Одно и то же место добавлено в корзину несколько раз.');
      if (busy[position]) stop('Ряд ' + seat.row + ', место ' + seat.seat + ' уже занято. Выберите другое.', 409);
      already[key] = true;
    });
    const subtotalMinor = checked(function () { return policy.subtotalFor(seats, hallData, sessionData); });
    return { sessionId: session.id, movieId: movie.id, movieTitle: movie.getString('title'),
      sessionDate: sessionData.date, sessionTime: sessionData.time, sessionFormat: session.getString('format'),
      hallName: hall.getString('name'), seats: seats, subtotalMinor: subtotalMinor };
  });
  const totals = policy.allocateTotals(normalized.map(function (item) { return item.subtotalMinor; }), percent);
  const subtotalMinor = normalized.reduce(function (sum, item) { return sum + item.subtotalMinor; }, 0);
  const totalMinor = totals.reduce(function (sum, value) { return sum + value; }, 0);
  return { ticketCount: ticketCount, subtotal: subtotalMinor / 100, totalPrice: totalMinor / 100,
    discountAmount: (subtotalMinor - totalMinor) / 100, discountPercent: percent, promoCode: policy.normalizePromo(body.promoCode),
    items: normalized.map(function (item, i) { return Object.assign({}, item, { subtotal: item.subtotalMinor / 100, totalPrice: totals[i] / 100, discountPercent: percent }); }) };
}
function checkout(e) {
  e.response.header().set('Cache-Control', 'no-store');
  const owner = ownerOf(e);
  const body = e.requestInfo().body;
  if (!/^[a-f0-9-]{36}$/.test(String(body.requestId || ''))) stop('Не удалось определить номер оформления. Обновите страницу.');
  const customer = checked(function () { return policy.customerFor(body.customer); });
  const requestHash = $security.sha256(JSON.stringify({ items: canonicalItems(body.items), promoCode: policy.normalizePromo(body.promoCode), customer: customer }));
  let result;
  e.app.runInTransaction(function (app) {
    const previous = records(app, 'checkout_requests', 'ownerKeyHash = {:owner} && requestKey = {:key}', { owner: owner, key: body.requestId });
    if (previous.length) {
      if (previous[0].getString('requestHash') !== requestHash) stop('Данные оформления изменились. Повторите отправку.', 409);
      result = (jsonField(previous[0], 'bookingIds') || []).map(function (id) { return receipt(get(app, 'bookings', id, 'Эта покупка уже отменена.')); });
      return;
    }
    const priced = quote(app, body);
    if (!Number.isFinite(body.expectedTotal) || Math.round(body.expectedTotal * 100) !== Math.round(priced.totalPrice * 100)) stop('Цена изменилась. Обновите расчёт перед оформлением.', 409);
    const collection = app.findCollectionByNameOrId('bookings');
    const seatsCollection = app.findCollectionByNameOrId('seat_reservations');
    const receipts = [];
    for (const item of priced.items) {
      const record = new Record(collection);
      record.load({ movieId: item.movieId, movieTitle: item.movieTitle, sessionId: item.sessionId,
        sessionDate: item.sessionDate, sessionTime: item.sessionTime, sessionFormat: item.sessionFormat,
        hallName: item.hallName, seats: item.seats, subtotal: item.subtotal, totalPrice: item.totalPrice,
        discountPercent: priced.discountPercent, customerName: customer.name, customerEmail: customer.email,
        customerPhone: customer.phone, purchaseDate: new Date().toISOString(), ownerKeyHash: owner, checkoutKey: body.requestId });
      app.save(record);
      for (const seat of item.seats) {
        const reservation = new Record(seatsCollection);
        reservation.load({ sessionId: item.sessionId, row: seat.row, seat: seat.seat, bookingId: record.id });
        try { app.save(reservation); } catch { stop('Одно из выбранных мест только что купили. Обновите схему зала.', 409); }
      }
      receipts.push(receipt(record));
    }
    const attempt = new Record(app.findCollectionByNameOrId('checkout_requests'));
    attempt.load({ ownerKeyHash: owner, requestKey: body.requestId, requestHash: requestHash, bookingIds: receipts.map(function (r) { return r.id; }) });
    app.save(attempt);
    result = receipts;
  });
  return e.json(200, { bookings: result, totalPrice: result.reduce(function (sum, record) { return sum + Math.round(record.totalPrice * 100); }, 0) / 100 });
}
function listBookings(e) {
  const owner = ownerOf(e);
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, { items: records(e.app, 'bookings', 'ownerKeyHash = {:owner}', { owner: owner }, '-purchaseDate').map(receipt) });
}
function checkoutStatus(e) {
  const owner = ownerOf(e);
  const found = records(e.app, 'checkout_requests', 'ownerKeyHash = {:owner} && requestKey = {:key}', { owner: owner, key: e.request.pathValue('id') });
  if (!found.length) stop('Оформление ещё не завершено.', 404);
  const items = (jsonField(found[0], 'bookingIds') || []).map(function (id) { return receipt(get(e.app, 'bookings', id, 'Покупка уже отменена.')); });
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, { bookings: items });
}
function cancelBooking(e) {
  const owner = ownerOf(e);
  const id = e.request.pathValue('id');
  e.app.runInTransaction(function (app) {
    const record = get(app, 'bookings', id, 'Покупка не найдена.');
    if (record.getString('ownerKeyHash') !== owner) stop('Покупка не найдена.', 404);
    for (const seat of records(app, 'seat_reservations', 'bookingId = {:id}', { id: id })) app.delete(seat);
    app.delete(record);
  });
  return e.noContent(204);
}
function availability(e) {
  const id = e.request.pathValue('id');
  const session = get(e.app, 'sessions', id, 'Сеанс не найден.');
  if (session.getBool('isArchived')) stop('Сеанс недоступен.', 404);
  const seats = records(e.app, 'seat_reservations', 'sessionId = {:id}', { id: id });
  e.response.header().set('Cache-Control', 'no-store');
  return e.json(200, { occupied: seats.map(function (seat) { return { row: seat.getInt('row'), seat: seat.getInt('seat') }; }) });
}
function regenerateSchedule(app) {
  let count = 0;
  app.runInTransaction(function (tx) {
    const movies = records(tx, 'movies', '', {}, 'title');
    const halls = records(tx, 'halls', '', {}, 'name');
    if (!movies.length || !halls.length) return;
    const collection = tx.findCollectionByNameOrId('sessions');
    const startDay = policy.dayInMoscow(Date.now());
    const times = ['10:00', '13:30', '16:00', '19:30', '22:00'];
    const formats = ['2D', '3D', 'IMAX'];
    // Пересоздаём только свободные сеансы. Купленные билеты и их сеансы сохраняем.
    const bookedIds = new Set(records(tx, 'bookings', '', {}).map(function (booking) { return booking.getString('sessionId'); }));
    const preservedSlots = new Set();
    for (const session of records(tx, 'sessions', 'isArchived = false', {})) {
      if (bookedIds.has(session.id)) {
        preservedSlots.add(session.getString('movieId') + '/' + session.getString('date') + '/' + session.getString('time'));
      } else {
        session.set('isArchived', true);
        tx.save(session);
      }
    }
    for (const movie of movies) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(Date.parse(startDay + 'T12:00:00Z') + day * 86400000).toISOString().slice(0, 10);
        for (const time of times) {
          if (preservedSlots.has(movie.id + '/' + date + '/' + time)) continue;
          const format = formats[Math.floor(Math.random() * formats.length)];
          const hall = halls.find(function (item) { return item.getString('name').includes('IMAX') === (format === 'IMAX'); });
          if (!hall) continue;
          const price = ({ '2D': 350, '3D': 450, IMAX: 600 })[format] + (time >= '18:00' ? 100 : 0);
          const session = new Record(collection);
          session.load({ movieId: movie.id, hallId: hall.id, date: date, time: time, format: format, price: price, isArchived: false });
          tx.save(session);
          count++;
        }
      }
    }
  });
  return count;
}
module.exports = { checkout, checkoutStatus, quote, listBookings, cancelBooking, availability, regenerateSchedule };
