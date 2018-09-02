import * as Promise from 'bluebird';

export interface Browser {
    navigateToNext(xpath : string) : Promise<void>;
    navigateToUrl(url : string) : Promise<void>;
    getUrl() : string;
    runXPath(xpath : string, attributes: string[]) : Promise<string[][]>;
    getPageTitle() : Promise<string>;
    close() : Promise<void>;
}