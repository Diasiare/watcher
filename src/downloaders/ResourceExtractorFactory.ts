import Resource from "./Resource";
import Episode from "../types/Episode";
import ResourceExtractor from "./ResourceExtractor";
import { Show } from "../data/Database";
import * as Promise from "bluebird";
import * as url from 'url';
import { Browser } from "./Browser";
const debug = require('debug')('watcher-resource-extractor')

export const resourceExtractors : {
    [key:string] : {
    parameters : string[],
    type : "global" | "primary",
    constructor : (show : Show) => ResourceExtractor | SecondaryResourceExtractor
}} = {
    "title-extractor" : {
        parameters : [],
        type : "global",
        constructor : (show : Show) => new TitleExtractor()
    },
    "image-extractor" : {
        parameters : ["image_xpath"],
        type : "primary",
        constructor : (show : Show) => new ImageResourceExtractor(show)
    },
    "description-extractor" : {
        parameters : ["text_xpath"],
        type : "global",
        constructor : (show : Show) => new SimpleSecondaryResourceExtractor(show.text_xpath, "outerHTML", Resource.description)
    }
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
    public extract(browser : Browser) : Promise<Resource[]> {
        return  browser.getPageTitle().then((title) => [Resource.title(title)]);
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
            .filter(([src, alt, title] : string) => !!src)
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

class ResourceExtractorFactory {
    public getResourceExtractor(show : Show) : ResourceExtractor {
        let secondarys : SecondaryResourceExtractor[] = <SecondaryResourceExtractor[]> this.buildExtractors(show, "global");


        let primary : ResourceExtractor[] = <ResourceExtractor[]> this.buildExtractors(show, "primary");

        if (primary.length != 1) {
            throw new Error("Wronmg number of primary resource extractors created")
        }

        return new GroupingResourceExtractor(primary[0], secondarys);
    }

    private buildExtractors(show : Show, type : "global" | "primary") : (ResourceExtractor | SecondaryResourceExtractor)[] {
        return show.getConfiguration().resourceExtractors
            .filter((r) => resourceExtractors[r.class].type === type)
            .filter((r) => {
                return resourceExtractors[r.class].parameters.every((param) => show[param])
            }).map(r => resourceExtractors[r.class].constructor(show)); 
    }
}




export default new ResourceExtractorFactory();