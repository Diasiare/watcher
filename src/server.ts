

import * as Promise from 'bluebird' ;
import {Database} from './data/Database';
import * as manager from './downloaders/manager';
import * as app from './webapp/app';
import Link from './link/BackLink';
const debug = require('debug')('watcher-server');


const db_name = "database.nedb"


let start = function (db_name) {
        return Promise.resolve()
            .return(db_name)
            .tap(() => debug("database init starting"))
            .then(Database.init)
            .tap(() => debug("database init done"))
            .then(()=>Database.getInstance())
            .then((db)=>Promise.resolve()
                .then(db.get_shows)
                .tap(() => debug("starting webapp"))
                .then((shows) => app.start_all(shows, Link))
                .tap(() => debug("started webapp"))
                .then(db.get_shows)
                .tap(() => debug("starting watchers"))
                .then(manager.start_watchers))
                .tap(() => debug("started watchers"))
            .done();
}

start(db_name);


