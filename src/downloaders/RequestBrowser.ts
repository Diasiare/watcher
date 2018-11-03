import { Browser } from "./Browser";
import * as request from 'request';
import * as uninitalized_xpath from 'xpath';
import * as parse5 from 'parse5';
import * as xmlser from 'xmlserializer';
import {DOMParser} from 'xmldom';
import * as Promise from 'bluebird';
import { LimitedResourceAllocator } from "./LimitedReourceAllocator";
import * as url from "url";
const xpathQuery : uninitalized_xpath.XPathSelect = uninitalized_xpath.useNamespaces({"x": "http://www.w3.org/1999/xhtml"});

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
    5,
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

    public constructor() {
        this.doc = null;
    }

    
    private makeRequest(url : string, remainingAttemps : number) : Promise<string> {
        return new Promise(function (resolve, reject) {
            request({
                url: url,
                method: 'GET',
                gzip: true,
                encoding: "utf-8",
                headers: {
                    'User-Agent': "request",
                }
            }, function (error, response, body) {
                if (error) {
                    if (error.code && error.code == "ECONNRESET") {
                        if (remainingAttemps > 0) {
                            resolve(Promise.delay(50).then(() =>
                                this.makeRequest(url, remainingAttemps - 1)));
                            return;
                        }
                    }
                    reject(error);
                    return;
                }
                resolve(body);
            }).on('error', (error) => {
                if (error) {
                    if (error.name && error.name == "ECONNRESET") {
                        if (remainingAttemps > 0) {
                            resolve(Promise.delay(50).then(() =>
                                this.makeRequest(url, remainingAttemps - 1)));
                            return;
                        }
                    }
                    reject(error);
                    return;
                }
            })
        })
    }

    private extractBody(body: string) : Document{
        var document = parse5.parse(body);
        var xhtml = xmlser.serializeToString(document);
        var doc = new DOMParser({
            errorHandler: () => {}
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
}