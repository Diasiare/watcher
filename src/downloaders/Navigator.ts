import {Page} from 'puppeteer'
import * as Promise from 'bluebird';

export default interface Navigator {
    next(page : Page) : Promise<Page> ;
}