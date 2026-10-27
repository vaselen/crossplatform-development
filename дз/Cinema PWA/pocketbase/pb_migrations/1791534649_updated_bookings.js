/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980")

  // add field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "number2607528692",
    "max": null,
    "min": null,
    "name": "movieId",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1152648825",
    "max": 200,
    "min": 0,
    "name": "movieTitle",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "number961590774",
    "max": null,
    "min": null,
    "name": "sessionId",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text975051140",
    "max": 20,
    "min": 0,
    "name": "sessionDate",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text4279547579",
    "max": 10,
    "min": 0,
    "name": "sessionTime",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2287149987",
    "max": 10,
    "min": 0,
    "name": "sessionFormat",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3075242111",
    "max": 100,
    "min": 0,
    "name": "hallName",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "json3219281744",
    "maxSize": 0,
    "name": "seats",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "number674557499",
    "max": null,
    "min": null,
    "name": "totalPrice",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text4236875316",
    "max": 100,
    "min": 0,
    "name": "customerName",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "exceptDomains": [],
    "help": "",
    "hidden": false,
    "id": "email803702556",
    "name": "customerEmail",
    "onlyDomains": [],
    "presentable": false,
    "required": true,
    "system": false,
    "type": "email"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2352639157",
    "max": 20,
    "min": 0,
    "name": "customerPhone",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2667277755",
    "max": 30,
    "min": 0,
    "name": "purchaseDate",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980")

  // remove field
  collection.fields.removeById("number2607528692")

  // remove field
  collection.fields.removeById("text1152648825")

  // remove field
  collection.fields.removeById("number961590774")

  // remove field
  collection.fields.removeById("text975051140")

  // remove field
  collection.fields.removeById("text4279547579")

  // remove field
  collection.fields.removeById("text2287149987")

  // remove field
  collection.fields.removeById("text3075242111")

  // remove field
  collection.fields.removeById("json3219281744")

  // remove field
  collection.fields.removeById("number674557499")

  // remove field
  collection.fields.removeById("text4236875316")

  // remove field
  collection.fields.removeById("email803702556")

  // remove field
  collection.fields.removeById("text2352639157")

  // remove field
  collection.fields.removeById("text2667277755")

  return app.save(collection)
})
