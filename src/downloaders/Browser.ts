import * as Promise from 'bluebird';
import { Configuration } from '../configuration/Configuration';

export interface Browser {
    navigateToNext(xpath : string) : Promise<void>;
    navigateToUrl(url : string) : Promise<void>;
    getUrl() : string;
    runXPath(xpath : string, attributes: string[]) : Promise<string[][]>;
    getPageTitle() : Promise<string>;
    close() : Promise<void>;
    setCookies(cookies: Configuration.Cookie[]): Promise<void>;
}