import * as Promise from 'bluebird' ;

Promise.config({
    cancellation: true
});


const current_watchers = {};


const watching_cycle = function (show: Show) {
    if (!current_watchers[show.identifier].p ||
        !current_watchers[show.identifier].p.isPending())
        current_watchers[show.identifier].p = imdown.download_sequence(show).catch((e) => {
            console.error("ERROR");
            console.error(e);
            console.error(show);
        });
}

const start_watcher = function (show: Show): Show {
    current_watchers[show.identifier] = {};
    watching_cycle(show);
    current_watchers[show.identifier].t = setInterval(watching_cycle, show.interval, show);
    return show;
}

const add_watcher = function (show: Show): Promise<Show> {
    return Promise.resolve(show)
        .then(stop_watcher)
        .then(start_watcher);
}

const stop_watcher = function (show: Show): Show {
    if (show.identifier in current_watchers) {
        clearInterval(current_watchers[show.identifier].t);
        current_watchers[show.identifier].p.cancel();
    }
    return show;
}

const start_watchers = function (shows: Show[]): Promise<Show[]> {
    //Stagger this so that the server doesn't become unresponsive every 15 min
    return Promise.all(shows.map((show, i) => Promise.resolve(show)
        .delay(i * 10000)
        .then(add_watcher)));
}

export {
    start_watchers,
    add_watcher,
    stop_watcher
};

import * as imdown from './image_sequence';
import {Show} from "../data/config";