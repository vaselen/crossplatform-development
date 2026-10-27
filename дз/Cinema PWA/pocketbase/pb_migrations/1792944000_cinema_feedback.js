migrate((app) => {
  app.save(new Collection({
    name: 'feedback', type: 'base',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'ownerKeyHash', type: 'text', required: true, max: 64 },
      { name: 'requestId', type: 'text', required: true, max: 36 },
      { name: 'name', type: 'text', required: true, min: 2, max: 80 },
      { name: 'message', type: 'text', required: true, min: 10, max: 2000 },
      { name: 'receivedAt', type: 'text', required: true, max: 40 },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_cinema_feedback ON feedback (ownerKeyHash, requestId)'],
  }));
}, (app) => { app.delete(app.findCollectionByNameOrId('feedback')); });
