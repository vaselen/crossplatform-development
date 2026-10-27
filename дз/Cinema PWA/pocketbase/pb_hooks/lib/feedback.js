function submit(e) {
  e.response.header().set('Cache-Control', 'no-store');
  const key = e.request.header.get('X-Cinema-Client');
  if (!/^[a-f0-9]{64}$/.test(key)) throw new ApiError(401, 'Не удалось определить браузер. Обновите страницу.');
  const body = e.requestInfo().body;
  if (typeof body.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(body.requestId)) throw new ApiError(400, 'Некорректный номер сообщения.');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (name.length < 2 || name.length > 80) throw new ApiError(400, 'Имя должно содержать от 2 до 80 символов.');
  if (message.length < 10 || message.length > 2000) throw new ApiError(400, 'Сообщение должно содержать от 10 до 2000 символов.');
  const owner = $security.sha256(key);
  let result;
  e.app.runInTransaction((app) => {
    const previous = app.findRecordsByFilter('feedback', 'ownerKeyHash = {:owner} && requestId = {:id}', '', 1, 0, { owner, id: body.requestId });
    let record = previous[0];
    if (record) {
      if (record.getString('name') !== name || record.getString('message') !== message) throw new ApiError(409, 'Этот номер уже использован для другого сообщения.');
    } else {
      record = new Record(app.findCollectionByNameOrId('feedback'));
      record.load({ ownerKeyHash: owner, requestId: body.requestId, name, message, receivedAt: new Date().toISOString() });
      app.save(record);
    }
    // A response lost after commit can be retried with the same requestId.
    result = { id: record.id, requestId: record.getString('requestId'), receivedAt: record.getString('receivedAt') };
  });
  return e.json(200, result);
}
module.exports = { submit };
