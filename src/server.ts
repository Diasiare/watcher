

import * as Promise from 'bluebird' ;
import {Database} from './data/Database';
import * as manager from './downloaders/manager';
import * as app from './webapp/app';
import Link from './link/BackLink';


const db_name = "database.sqlite"
const specific_show: string = process.env.ONE_SHOW;

console.log("SPECIFIC_SHOW: " + specific_show);

let start = function (db_name) {
        return Promise.resolve()
            .return(db_name)
            .then(Database.init)
            .then(()=>Database.getInstance())
            .then((db)=>Promise.resolve()
                .then(db.get_shows)
                .then((shows) => { 
                    return app.start_all(shows, Link);
                })
                .then(db.get_shows)
                .then((shows) => {
                    if (specific_show) {
                        return shows.filter((show) => show.identifier === specific_show);
                    } else {
                        return shows;
                    }
                })
                .then(manager.start_watchers))
            .done();
}

start(db_name);


