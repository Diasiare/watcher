import * as Promise from 'bluebird' ;
import * as puppeteer from 'puppeteer';

Promise.config({
    cancellation: true
});

let browser : Promise<puppeteer.Browser> = null;
let activeCount = 0;
const current_watchers : Map<string, Watcher>=  new Map();
const queue : ((p : Promise<puppeteer.Page>) => void)[] = [];

function allocatePage() : Promise<puppeteer.Page> {
    if (!browser) {
        browser = Promise.resolve(
            puppeteer.launch({
                headless : true,
            }));
    } 

    if (activeCount >= 10) {
        return new Promise((resolve) =>{
            queue.push(resolve);
        })
    } else {
        activeCount++;
        return browser.then((b) => b.newPage())
    }
}

function dealocatePage(page : puppeteer.Page) {    
    if (activeCount <= 1) {
        activeCount--;
        let tmpbrowser = browser;
        browser = null;
        return tmpbrowser.then(b => b.close());
    } else if (queue.length != 0){
        queue.shift()(browser.then((b) => b.newPage()));
        return page.close();
    } else {
        activeCount--;
        return page.close();
    }
}
const start_watcher = function (show: Show): Show {
    current_watchers.set(show.identifier, new Watcher(
        () => allocatePage().disposer(dealocatePage)
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
