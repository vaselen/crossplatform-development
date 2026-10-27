migrate((app) => {
  for (const name of ['movies', 'cinemas', 'halls', 'sessions']) {
    const collection = app.findCollectionByNameOrId(name);
    collection.listRule = name === 'sessions' ? 'isArchived = false' : '';
    collection.viewRule = name === 'sessions' ? 'isArchived = false' : '';
    collection.createRule = null;
    collection.updateRule = null;
    collection.deleteRule = null;
    if (name === 'sessions') collection.fields.add(new BoolField({ name: 'isArchived' }));
    app.save(collection);
  }

  const bookings = app.findCollectionByNameOrId('bookings');
  bookings.listRule = null;
  bookings.viewRule = null;
  bookings.createRule = null;
  bookings.updateRule = null;
  bookings.deleteRule = null;
  bookings.fields.add(new TextField({ name: 'ownerKeyHash', max: 64 }));
  bookings.fields.add(new NumberField({ name: 'subtotal', min: 0 }));
  bookings.fields.add(new NumberField({ name: 'discountPercent', min: 0, max: 100 }));
  bookings.fields.add(new TextField({ name: 'checkoutKey', max: 64 }));
  app.save(bookings);

  app.save(new Collection({
    name: 'seat_reservations', type: 'base',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'sessionId', type: 'text', required: true },
      { name: 'row', type: 'number', required: true, min: 1, onlyInt: true },
      { name: 'seat', type: 'number', required: true, min: 1, onlyInt: true },
      { name: 'bookingId', type: 'relation', collectionId: bookings.id, required: true, maxSelect: 1, cascadeDelete: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_cinema_seat ON seat_reservations (sessionId, row, seat)'],
  }));
  app.save(new Collection({
    name: 'checkout_requests', type: 'base',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'ownerKeyHash', type: 'text', required: true, max: 64 },
      { name: 'requestKey', type: 'text', required: true, max: 64 },
      { name: 'requestHash', type: 'text', required: true, max: 64 },
      { name: 'bookingIds', type: 'json', required: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_cinema_checkout ON checkout_requests (ownerKeyHash, requestKey)'],
  }));

  const corrections = { gc6ix6kmeo32k3f: 'lw9pvqa8i016tvb', zemjsk9wui8v0i2: '7veugx8pi9t97fl' };
  for (const hall of app.findRecordsByFilter('halls', '', '', 0, 0)) {
    const intended = corrections[hall.id] || hall.getString('cinemaId').trim();
    app.findRecordById('cinemas', intended);
    hall.set('cinemaId', intended);
    app.save(hall);
  }

  // Сохраняем исходные данные как архив и создаём расписание на текущую неделю.
  for (const session of app.findRecordsByFilter('sessions', '', '', 0, 0)) {
    session.set('isArchived', true);
    app.save(session);
  }
  for (const booking of app.findRecordsByFilter('bookings', '', '', 0, 0)) {
    booking.set('subtotal', booking.getFloat('totalPrice'));
    app.save(booking);
  }
  require(`${__hooks}/lib/cinema.js`).regenerateSchedule(app);
});
