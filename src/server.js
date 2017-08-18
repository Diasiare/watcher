
const Promise = require('bluebird');
// Constants
const db_name = "database.sqlite"


start = function (db_name) {
	return db.init(db_name)
		.then(config.get_shows)
		.then(app.start_all)
		.then(config.get_shows)
		.then(manager.start_watchers)
		.done();
}

const image_sequence = require('./downloaders/image_sequence');
const db = require('./data/db');
const config = require('./data/config');
const manager = require('./downloaders/manager');
const app = require('./webapp/app');
start(db_name);


