import {Browser} from './Browser';
import {getPuppeteerBrowser} from './PuppeteerBrowser';
import { Show } from '../data/Database';
import * as Promise from 'bluebird';
import {getRequestBrowser} from './RequestBrowser';

export function getBrowser(show : Show) : Promise<Browser> {
    if (show.requireJS) {
        return getPuppeteerBrowser(true);
    } else {
        return getRequestBrowser();
    }
    
}