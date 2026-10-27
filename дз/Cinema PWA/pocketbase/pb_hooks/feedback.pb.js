routerAdd('POST', '/api/cinema/feedback', (e) => require(`${__hooks}/lib/feedback.js`).submit(e), $apis.bodyLimit(8192));
