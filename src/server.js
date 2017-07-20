'use strict';

const express = require('express');
const image_sequence = require('./downloaders/image_sequence');
const db = require('./data/db');
const config = require('./data/config');
const manager = require('./downloaders/manager');
// Constants
const PORT = 8080;
const db_name = "database.sqlite"
// App

/*
const app = express();
app.get('/', function (req, res) {
  res.send('Hello world\n');
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
*/

var start = function (db_name) {
	return db.init(db_name).then(config.get_shows).then(db.resolve_shows).then(manager.start_watchers).done();
}

start(db_name);


