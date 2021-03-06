import {Browser} from './Browser';
import * as puppeteer from 'puppeteer';
import {Page} from 'puppeteer'
import * as Promise from 'bluebird';
import { LimitedResourceAllocator } from './LimitedReourceAllocator';
import { Configuration } from '../configuration/Configuration';
const debug = require('debug')('watcher-browser-puppeteer');

let allocator : LimitedResourceAllocator<Page, puppeteer.Browser> = null;

export function getPuppeteerBrowser(headless ?: boolean) : Promise<PuppeteerBrowser> {
    if (!allocator) {
        allocator = new LimitedResourceAllocator(
            10,
            (b : puppeteer.Browser) => Promise.resolve(b.newPage()),
            (page : Page) => Promise.resolve(page.close()).catch((e) => {
                debug("Could not close page", e);
            }),
            () =>  Promise.resolve(
                puppeteer.launch({
                    headless : headless,
                }).catch(e => puppeteer.launch({
                    headless : headless,
                    executablePath: '/usr/bin/chromium-browser'
                }))
            ),
            (browser : puppeteer.Browser) => Promise.resolve(browser.close()).catch((e) => {
                debug("Could not close browser", e);
            })
        )
    }
    return allocator.allocate().then(page => new PuppeteerBrowser(page));
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
            .then(() => this.page.bringToFront()).then(() => undefined);
    }


    public navigateToUrl(url : string) : Promise<void> {
        return Promise.resolve(this.page.goto(url, {
            timeout : 120 * 1000
        }))
        .then(() => undefined);
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
        let p = allocator.dealocate(this.page);
        this.page = undefined;
        return p;
    }

    public setCookies(cookies: Configuration.Cookie[]): Promise<void> {
        return Promise.resolve(cookies).map(async (cookie : Configuration.Cookie) => {
            await this.page.setCookie({
                name: cookie.name,
                value: cookie.value,
                url: "https://" + cookie.domain,
                domain: "." + cookie.domain,
                expires: Date.now()/1000 + 60* 60,
            });
        }).then(() => undefined);
    }
}
