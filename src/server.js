'use strict';

const image_sequence = require('./downloaders/image_sequence');
const db = require('./data/db');
const config = require('./data/config');
const manager = require('./downloaders/manager');
const app = require('./webapp/app');

// Constants
const db_name = "database.sqlite"





var start = function (db_name) {
	return db.init(db_name)
		.then(config.get_shows)
		.then(db.resolve_shows)
		.then(app.start_all)
		.then(config.get_shows)
		.then(manager.start_watchers)
		.done();
}

start(db_name);


