import Resource from "./Resource";
import Episode from "../types/Episode";
import ResourceExtractor from "./ResourceExtractor";
import { Show } from "../data/Database";
import * as Promise from "bluebird";
import * as url from 'url';
import { Browser } from "./Browser";
const debug = require('debug')('watcher-resource-extractor')

export const resourceExtractors = {
    "title-extractor" : {
        parameters : [],
        type : "global",
        constrcutor : (show : Show) => new TitleExtractor()
    },
    "image-extractor" : {
        parameters : ["next_xpath"],
        type : "primary",
        constrcutor : (show : Show) => new ImageResourceExtractor(show)
    },
    "description-extractor" : {
        parameters : ["text_xpath"],
        type : "global",
        constrcutor : (show : Show) => new SimpleSecondaryResourceExtractor(show.text_xpath, "outerHTML", Resource.description)
    }
}

function createDownloadRace(page, xpath, attrNames) : Promise<string[][]>[] {
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

function getAttribute(page : Page, xpath : string ,attrNames : string[]) : Promise<string[][]>{
    return Promise.delay(1000).tap(() => debug("Starting xpath " + xpath + " attrNames" + attrNames))
    .then(() => createDownloadRace(page, xpath, attrNames))
    .any<string[][]>().tap((value : string[][]) => debug("Ran xpath " + xpath + " attrNames" + attrNames + " result " + value));
}

interface  SecondaryResourceExtractor {
    extract(browser : Browser) : Promise<Resource[]> ;
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

    extract(browser : Browser) : Promise<Resource[]> {
        return browser.runXPath(this.xpath, [this.attrName]).map(value => {
            return this.resourceType(value[0]);
        });
    }

}

class TitleExtractor implements SecondaryResourceExtractor {
    public extract(page : Page) : Promise<Resource[]> {
        return Promise.resolve(page.waitForFunction("document.title"))
        .then(() => page.title())
        .then(title => [Resource.title(title)])  
    }
 
}

class ResourceExtractorFactory {
    public getResourceExtractor(show : Show) : ResourceExtractor {
         let secondarys : SecondaryResourceExtractor[] = [new TitleExtractor()]; 

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

    extract(browser: Browser): Promise<[Episode, Resource[]][]> {
        let base_count = this.show.number;

        return browser.runXPath(this.show.image_xpath, ['src', 'alt', "title"])
            .map(([src, alt, title] : string, index) : [Episode, Resource[]] => {
                let episode : Episode = {
                    base_url : browser.getUrl(),
                    identifier : this.show.identifier,
                    number : base_count + index + 1,
                    url :  url.resolve(browser.getUrl(), src),
                    data : {}
                }

                if (!title) {
                    debug("No title found, switching to alt:", alt);
                    title = alt;
                }

                let image : Resource = Resource.image(episode.url);
                if (title) {     
                    let altRes : Resource = Resource.altText(title);
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

    extract(browser : Browser) : Promise<[Episode, Resource[]][]> {
        return new Promise(async (resolve, reject) => {
            let [primarys, globalResources] = await Promise.all([this.primary.extract(browser), Promise.all(this.globals.map((secondary) => secondary.extract(browser)))]);
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