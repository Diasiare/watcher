import {Browser} from './Browser';
import {getPuppeteerBrowser} from './PuppeteerBrowser';
import { Show } from '../data/Database';
import * as Promise from 'bluebird';
import {getRequestBrowser} from './RequestBrowser';
const debug = require('debug')('watcher-browser-factory');


export function getBrowser(show : Show) : Promise<Browser> {
    debug("Creating browser for: ", show.name, ", requireJs:", show.requireJS, "---", typeof show.requireJS);
    if (show.requireJS) {
        return getPuppeteerBrowser(true);
    } else {
        return getRequestBrowser();
    }
    
}