routerAdd('GET', '/api/cinema/info', (e) => e.json(200, { application: 'cinema-pwa', apiVersion: 1, timezone: 'Europe/Moscow' }));
routerAdd('GET', '/api/cinema/sessions/{id}/seats', (e) => require(`${__hooks}/lib/cinema.js`).availability(e));
routerAdd('POST', '/api/cinema/quote', (e) => e.json(200, require(`${__hooks}/lib/cinema.js`).quote(e.app, e.requestInfo().body)), $apis.bodyLimit(32768));
routerAdd('POST', '/api/cinema/checkout', (e) => require(`${__hooks}/lib/cinema.js`).checkout(e), $apis.bodyLimit(32768));
routerAdd('GET', '/api/cinema/checkout/{id}', (e) => require(`${__hooks}/lib/cinema.js`).checkoutStatus(e));
routerAdd('GET', '/api/cinema/bookings', (e) => require(`${__hooks}/lib/cinema.js`).listBookings(e));
routerAdd('DELETE', '/api/cinema/bookings/{id}', (e) => require(`${__hooks}/lib/cinema.js`).cancelBooking(e));
routerAdd('POST', '/api/cinema/admin/schedule', (e) => e.json(200, { created: require(`${__hooks}/lib/cinema.js`).regenerateSchedule(e.app) }), $apis.requireSuperuserAuth());
