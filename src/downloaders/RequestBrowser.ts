import { Browser } from "./Browser";
import * as request from 'request';
import * as uninitalized_xpath from 'xpath';
import * as parse5 from 'parse5';
import * as xmlser from 'xmlserializer';
import {DOMParser} from 'xmldom';
import * as Promise from 'bluebird';
import { LimitedResourceAllocator } from "./LimitedReourceAllocator";
import * as url from "url";
import { Configuration } from "../configuration/Configuration";
const xpathQuery : uninitalized_xpath.XPathSelect = uninitalized_xpath.useNamespaces({"x": "http://www.w3.org/1999/xhtml"});
const debug = require('debug')('watcher-browser-request');

function stripUri(doc : Document) : Document{
    let v = new Set();
    stripUriRecursive(v, doc);
    return doc;
}

function stripUriRecursive(v, e) {
    v.add(e);
    if ('namespaceURI' in e) e.namespaceURI = null;
    for (var p in e) {
        if (!v.has(e[p]) &&
            e[p] !== null &&
            typeof(e[p]) == "object") {
            stripUriRecursive(v, e[p]);
        }
    }
}

const allocator : LimitedResourceAllocator<RequestBrowser, null> = new LimitedResourceAllocator(
    3,
    (b : null) => Promise.resolve(new RequestBrowser()),
    (browser : RequestBrowser) => Promise.resolve(),
    () => Promise.resolve(null),
    (browser : null) => Promise.resolve()
)

export function getRequestBrowser() {
    return allocator.allocate();
}


export class RequestBrowser implements Browser {

    private doc : Document;
    private url : string;
    private cookieJar : Configuration.Cookie[] = [];

    public constructor() {
        this.doc = null;
    }
    
    private makeRequest(url : string, remainingAttemps : number) : Promise<string> {
        return new Promise<string>((resolve, reject) => {
            debug("Sending request to ", url, " remanding attempts ", remainingAttemps);

            const cookies = this.cookieJar.filter(cookie => this.cookieMatches(url, cookie.domain));
            const jar = request.jar();
            cookies.forEach((cookie : Configuration.Cookie) => jar.setCookie(cookie.name + "=" + cookie.value, url));
            

            request({
                url: url,
                method: 'GET',
                gzip: true,
                encoding: "utf-8",
                headers: {
                    'User-Agent': "request",
                },
                jar,
            }, (error, response, body) => {
                if (error) {
                    debug("Got error", error)
                    reject(error);
                    return;
                } else {
                    resolve(body);
                }
            })
        }).catch((error) => {
            if (remainingAttemps > 0) {
                debug("Retrying");
                return Promise.delay(50).then(() => this.makeRequest(url, remainingAttemps - 1));
            }
            throw error;
        }).delay(100);
    }

    private extractBody(body: string) : Document{
        var document = parse5.parse(body);
        var xhtml = xmlser.serializeToString(document);
        var doc = new DOMParser({
            errorHandler: (level,msg) => debug(level,msg)
        }).parseFromString(xhtml);
        return stripUri(doc);
    }

    public navigateToNext(xpath : string) : Promise<void> {
        return this.runXPath(xpath, ['href'])
            .then(attrs => {
                if (attrs.length < 1) {
                    throw new Error("Failed to naviagte to next");
                }
                return this.navigateToUrl(url.resolve(this.url,attrs[0][0]))
            });
    }
    public navigateToUrl(url : string) : Promise<void> {
        return this.makeRequest(url, 10)
            .then(this.extractBody)
            .then((doc : Document) => {
                this.doc = doc;
                this.url = url;
            })
            .return();
    }
    public getUrl() : string {
        return this.url;
    }
    public runXPath(xpath : string, attributes: string[]) : Promise<string[][]> {
        let nodes : Element[] = <Element[]> xpathQuery(xpath, this.doc);
        return Promise.resolve(nodes.map(node => attributes.map(a => {
            if (a === "outerHTML") {
                return xmlser.serializeToString(node, true);
            }
            return node.getAttribute(a);
        })));
    }
    
    public getPageTitle() : Promise<string> {
        let title = <any[]> xpathQuery("//title/text()", this.doc);
        if (title.length > 0) return Promise.resolve(title[0].data);
        return Promise.resolve("");
    }
    
    public close() : Promise<void> {
        this.doc = undefined;
        this.url = undefined;
        return allocator.dealocate(this);
    }

    public setCookies(cookies: Configuration.Cookie[]) {
        this.cookieJar = cookies;
        return Promise.resolve();
    }

    private cookieMatches(requestUrl : string, cookieDomain: string) : boolean {
        const domain = new URL(requestUrl).hostname;
        return domain.endsWith(cookieDomain); 
    }
}