import * as Promise from 'bluebird';
import { Browser } from './Browser';

export default interface Navigator {
    next(page : Browser) : Promise<Browser> ;
}