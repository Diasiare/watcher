import { Show } from "../data/Database";
import Navigator from "./Navigator";
import * as Promise from 'bluebird';
import {Browser} from './Browser';
const debug = require('debug')('watcher-navigator-factory');

class BasicNavigator implements Navigator {
    
    private show : Show;
    private first : boolean = true;

    constructor(show : Show) {
        this.show = show;
    }

    public next(browser : Browser) : Promise<Browser> {
        if (this.first) {
            let url : Promise<string>;
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
        return browser.navigateToNext(xpath).then(() => browser);
    }

}

class NavigatorFactory {
    public getNavigator(show : Show) : Navigator {
        return new BasicNavigator(show);
    }
}

export default new NavigatorFactory();