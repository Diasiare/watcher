import {Browser} from './Browser';
import {getPuppeteerBrowser} from './PuppeteerBrowser';
import { Show } from '../data/Database';
import * as Promise from 'bluebird';
import {getRequestBrowser} from './RequestBrowser';
const debug = require('debug')('watcher-browser-factory');


const specific_show: string = process.env.ONE_SHOW;

export function getBrowser(show : Show) : Promise<Browser> {
    debug("Creating browser for: ", show.name, ", requireJs:", show.requireJS, "---", typeof show.requireJS);
    let browser : Promise<Browser>;
    if (show.requireJS) {
        browser = getPuppeteerBrowser(!specific_show);
    } else {
        browser = getRequestBrowser();
    }

    const cookies = show.getConfiguration().cookies;
    if (cookies) {
        browser = browser.then(async (b) => {
            await b.setCookies(show.getConfiguration().cookies);
            return b;
        });
    }
    return browser;
}