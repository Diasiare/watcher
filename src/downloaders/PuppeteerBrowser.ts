import {Browser} from './Browser';
import * as puppeteer from 'puppeteer';
import {Page} from 'puppeteer'
import * as Promise from 'bluebird';
const debug = require('debug')('watcher-browser-puppeteer');

let browser : Promise<puppeteer.Browser> = null;
let activeCount = 0;
const queue : ((p : Promise<puppeteer.Page>) => void)[] = [];

function allocatePage(headless : boolean) : Promise<puppeteer.Page> {
    if (!browser) {
        browser = Promise.resolve(
            puppeteer.launch({
                headless : headless,
            }).catch(e => puppeteer.launch({
                headless : headless,
                executablePath: '/usr/bin/chromium-browser'
            }))
        );
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

function dealocatePage(page : puppeteer.Page) : Promise<void> {    
    if (activeCount <= 1) {
        activeCount--;
        let tmpbrowser = browser;
        browser = null;
        return tmpbrowser.then(b => b.close());
    } else if (queue.length != 0){
        queue.shift()(browser.then((b) => b.newPage()));
        return Promise.resolve(page.close());
    } else {
        activeCount--;
        return Promise.resolve(page.close());
    }
}

export function getPuppeteerBrowser(headless ?: boolean) : Promise<PuppeteerBrowser> {
    return allocatePage(!!headless).then((page : Page) => new PuppeteerBrowser(page));
}


export class PuppeteerBrowser implements Browser {
    private page : Page;

    public constructor(page : Page) {
        this.page = page;
    }

    public navigateToNext(xpath : string) : Promise<void> {
        let start_url : string = this.page.url();
        return Promise.resolve(this.page.waitForXPath(xpath))
            .then((element) => 
                element.getProperty("href")
                .then((handle) => handle.jsonValue())
                .then((href) => {
                    debug("Navigating via goto for ", this.page.url, " to ", href);
                    return this.page.goto(href, {
                        timeout : 120 * 1000
                    });
                })
                .catch(() => {
                    debug("Navigating via click for ", this.page.url, " with xpath ", xpath)
                    return Promise.resolve(element.click()).delay(30 * 1000);
                })
            )
            .then(() => this.page.bringToFront()).then(() => {
                if (this.page.url() == start_url) {
                    throw new Error("Navigation from " + start_url + " led to same page");
                }
            }).then(() => undefined);
    }


    public navigateToUrl(url : string) : Promise<void> {
        return Promise.resolve(this.page.goto(url, {
            timeout : 120 * 1000
        })).then(() => undefined);
    }


    public getUrl() : string {
        return this.page.url();
    }

    private createDownloadRace(page, xpath, attrNames) : Promise<string[][]>[] {
        let promises = [];
        for (let i = 0; i < 4; i++) {
            promises.push(
                Promise.delay(i * 2000)
                .then((() => page.evaluate((xpath, attrNames) => {
                    try {
                        let results = [];
                        let query = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
                        let r = query.iterateNext();
                        console.log(r);
                        while(r) {
                            results.push(attrNames.map(name => (<any>r)[name]));
                            r = query.iterateNext();
                        }
                        return results;
                    } catch (e) {
                        return attrNames.map(() => null);
                    }
        
                }, xpath, attrNames)))
                .timeout(5000 ,"Failed to get information")
            );
        }
        return promises;
    }
    
    public runXPath(xpath : string ,attrNames : string[]) : Promise<string[][]>{
        return Promise.delay(1000).tap(() => debug("Starting xpath " + xpath + " attrNames" + attrNames))
        .then(() => this.createDownloadRace(this.page, xpath, attrNames))
        .any<string[][]>().tap((value : string[][]) => debug("Ran xpath " + xpath + " attrNames " + attrNames + " result " + value));
    }


    public getPageTitle() : Promise<string> {
       return Promise.resolve(this.page.waitForFunction("document.title")).then(() => this.page.title());
    }

    
    public close() : Promise<void> {
        return dealocatePage(this.page);
    }
}