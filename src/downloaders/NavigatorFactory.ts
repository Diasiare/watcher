import { Show } from "../data/Database";
import Navigator from "./Navigator";
import * as Promise from 'bluebird';
import {Browser} from './Browser';
import {Configuration} from '../configuration/Configuration';
const debug = require('debug')('watcher-navigator-factory');

export const navigators = {
    "sequence-navigator" :  {
        parameters : ["next_xpath"],
        constructor : (show) => new BasicNavigator(show)
    }
}

class BasicNavigator implements Navigator {
    
    private show : Show;
    private first : boolean = true;

    constructor(show : Show) {
        this.show = show;
    }

    public next(browser : Browser) : Promise<Browser> {
        if (this.first) {
            if (this.show.number == 0) {
                debug("First time navigation to ", this.show.base_url, " for ", this.show.name);
                return browser.navigateToUrl(this.show.base_url)
                .then(() => {
                    this.first = false;
                    return browser;
                });
            } else {
                return this.show.get_episode_page_url(this.show.number)
                    .tap((url) => debug("First run navigation to ", url, " for ", this.show.name))
                    .then((url) => browser.navigateToUrl(url))
                    .catch((e) => debug("Navigation failed, trying next anyway", e))
                    .then(() => {
                        this.first = false;
                        return browser;
                    })
                    .then(() => this.next(browser));
            }
        }
        let xpath = this.show.next_xpath;
        let url = browser.getUrl();
        return browser.navigateToNext(xpath)
            .then(() => {
                if (browser.getUrl() === url) {
                    throw new Error("Navigation from " + url + " failed, led to same url")
                }
            })
            .then(() => browser);
    }
}

class NavigatorSequence implements Navigator {
    private navigators : Navigator[];

    constructor(navigators : Navigator[]) {
        this.navigators = navigators;
    }
    
    public next(browser : Browser) : Promise<Browser> {
        if (this.navigators.length < 1) {
            return Promise.reject(new Error("Out of navigators"));
        }
        return this.navigators[0].next(browser).catch((error) => {
            debug("Navigation failed with error moving to next navigator", error);
            this.navigators.shift();
            return this.next(browser);
        });
    }
}

class NavigatorFactory {
    public getNavigator(show : Show) : Navigator {
        if (!show.navigator_configuration) {
            return this.buildFrom(show, show.getConfiguration().navigationConfigurations["all"]);
        } else {
            return this.buildFrom(show, show.getConfiguration().navigationConfigurations[show.navigator_configuration]);
        }
    }

    private buildFrom(show : Show, confs : Configuration.NavigationConfiguration[]) : Navigator {
        return new NavigatorSequence(confs.map((conf) => {
            return navigators[conf.class].constructor(show);
        }));
    }
}

export default new NavigatorFactory();