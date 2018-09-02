import {Browser} from './Browser';
import {PuppeteerBrowser, getPuppeteerBrowser} from './PuppeteerBrowser';
import { Show } from '../data/Database';
import * as Promise from 'bluebird';
import { RequestBrowser } from './RequestBrowser';

export function getBrowser(show : Show) : Promise<Browser> {
    if (show.requireJS) {
        return getPuppeteerBrowser(true);
    } else {
        return Promise.resolve(new RequestBrowser());
    }
    
}