

import * as Promise from 'bluebird' ;
import {Database} from './data/config';
import * as manager from './downloaders/manager';
import * as app from './webapp/app';
import Link from './link/BackLink';


const db_name = "database.sqlite"


let start = function (db_name) {
        return Promise.resolve()
            .return(db_name)
            .then(Database.init)
            .then(()=>Database.getInstance()
                .then((db)=>Promise.resolve()
                    .then(db.get_shows)
                    .then((shows) => app.start_all(shows, Link))
                    .then(db.get_shows)
                    .then(manager.start_watchers)
                )
            )
        .done();
}

start(db_name);


