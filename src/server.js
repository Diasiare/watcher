
const Promise = require('bluebird');
const fs = require('fs');
const shell = require('shelljs');
const path = require('path');

const db_name = "database.sqlite"


let start = function (db_name) {
        return Promise.resolve()
        .return(db_name)
        .then(db.init)
        .then(db.get_shows)
        .then(app.start_all)
        .then(db.get_shows)
        .then(manager.start_watchers)
        .done();
}

const image_sequence = require('./downloaders/image_sequence');
const db = require('./data/config');
const manager = require('./downloaders/manager');
const app = require('./webapp/app');
start(db_name);


