import * as Promise from 'bluebird' ;
import {getBrowser} from './BrowserFactory';

Promise.config({
    cancellation: true
});

const current_watchers : Map<string, Watcher>=  new Map();

const start_watcher = function (show: Show): Show {
    current_watchers.set(show.identifier, new Watcher(
        () => getBrowser(show).disposer((browser) => browser.close())
        ,show))
    current_watchers.get(show.identifier).start();
    return show;
}

const add_watcher = function (show: Show): Promise<Show> {
    return Promise.resolve(show)
        .then(stop_watcher)
        .then(start_watcher);
}

const stop_watcher = function (show: Show): Promise<Show> {
    if (current_watchers.has(show.identifier)) {
        current_watchers.get(show.identifier).stop();
        current_watchers.delete(show.identifier);
    }
    return Promise.resolve(show);
}

const start_watchers = function (shows: Show[]): Promise<Show[]> {
    return Promise.all(shows.map((show) => add_watcher(show)));
}

export {
    start_watchers,
    add_watcher,
    stop_watcher
};

import {Show} from "../data/Database";
import { Watcher } from './Watcher';
