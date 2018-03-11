
import * as Promise from 'bluebird' ;
import * as image_sequence from './downloaders/image_sequence';
import * as db from './data/config';
import * as manager from './downloaders/manager';
import * as app from './webapp/app';

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

start(db_name);


