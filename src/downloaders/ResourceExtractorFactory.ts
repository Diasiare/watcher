import Resource from "./Resource";
import Episode from "../types/Episode";
import ResourceExtractor from "./ResourceExtractor";
import { Show } from "../data/Database";
import { Page, ElementHandle, JSHandle } from "puppeteer";
import * as Promise from "bluebird";
import ResourceType from "./ResourceType";
import * as url from 'url';
const debug = require('debug')('watcher-resource-extractor')

function createDownloadRace(page, xpath, attrNames) : Promise<string[][]>[] {
    let promises = [];
    for (let i = 0; i < 4; i++) {
        promises.push(
            Promise.delay(i * 1000)
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
            .timeout(3000 ,"Failed to get information")
        );
    }
    return promises;
}

function getAttribute(page : Page, xpath : string ,attrNames : string[]) : Promise<string[][]>{
    return Promise.delay(1000).tap(() => debug("Starting xpath " + xpath + " attrNames" + attrNames))
    .then(() => createDownloadRace(page, xpath, attrNames))
    .any<string[][]>().tap((value : string[][]) => debug("Ran xpath " + xpath + " attrNames" + attrNames + " result " + value));
}

interface  SecondaryResourceExtractor {
    extract(page : Page) : Promise<Resource[]> ;
}

class SimpleSecondaryResourceExtractor implements SecondaryResourceExtractor {
    private xpath : string;
    private attrName : string;
    private resourceType : (data : string) => Resource;

    constructor(xpath : string, attrName : string, resourceType : (data : string) => Resource) {
        this.xpath = xpath;
        this.attrName = attrName;
        this.resourceType = resourceType;
    }

    extract(page : Page) : Promise<Resource[]> {
        return getAttribute(page, this.xpath, [this.attrName]).map(value => {
            return this.resourceType(value[0]);
        });
    }

}

class ResourceExtractorFactory {
    public getResourceExtractor(show : Show) : ResourceExtractor {
         let secondarys : SecondaryResourceExtractor[] = [{
            extract : (page : Page) : Promise<Resource[]> => 
                Promise.resolve(page.waitForFunction("document.title")).then(() => page.title())
                .then(title => [Resource.title(title)])
        }]; 

        if (show.text_xpath) {
            secondarys.push(
                new SimpleSecondaryResourceExtractor(show.text_xpath, "outerHTML", Resource.description),
            )
        }

        return new GroupingResourceExtractor(
            new ImageResourceExtractor(show), secondarys);
    }
}

class ImageResourceExtractor implements ResourceExtractor {
    private show : Show;

    constructor(show : Show) {
        this.show = show;
    }

    extract(page: Page): Promise<[Episode, Resource[]][]> {
        let base_count = this.show.number;

        return getAttribute(page, this.show.image_xpath, ['src', 'alt'])
            .map(([src, alt] : string, index) : [Episode, Resource[]] => {
                let episode : Episode = {
                    base_url : page.url(),
                    identifier : this.show.identifier,
                    number : base_count + index + 1,
                    url :  url.resolve(page.url(), src),
                    data : {}
                }

                let image : Resource = Resource.image(episode.url);
                if (alt) {     
                    let altRes : Resource = Resource.altText(alt);
                    return [episode, [image, altRes]];
                }
                return [episode, [image]];
            }).filter(([episode, res]) => {
                return this.show.check_image_exists(episode.url).then((v) => !v)
            })
    }

}

class GroupingResourceExtractor implements ResourceExtractor {
    private primary : ResourceExtractor;
    private globals : SecondaryResourceExtractor[];

    constructor(primary : ResourceExtractor, globals : SecondaryResourceExtractor[]) {
        this.primary = primary;
        this.globals = globals;
    }

    extract(page : Page) : Promise<[Episode, Resource[]][]> {
        return new Promise(async (resolve, reject) => {
            let [primarys, globalResources] = await Promise.all([this.primary.extract(page), Promise.all(this.globals.map((secondary) => secondary.extract(page)))]);
            let value : [Episode, Resource[]][] = primarys.map(([episode, resources]) : [Episode, Resource[]] => {
                resources.push(...globalResources.reduce((res, val) => res.concat(val), []));
                return [episode, resources];
            })
            debug("Extracted episodes", JSON.stringify(value, null, 4));
            resolve(value);
        })
    }
}


export default new ResourceExtractorFactory();