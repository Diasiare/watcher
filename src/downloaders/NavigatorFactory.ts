import { Show } from "../data/Database";
import Navigator from "./Navigator";
import * as Promise from 'bluebird';
import { Page } from "puppeteer";
const debug = require('debug')('watcher-navigator-factory');

class BasicNavigator implements Navigator {
    
    private show : Show;
    private first : boolean = true;

    constructor(show : Show) {
        this.show = show;
    }

    public next(page : Page) : Promise<Page> {
        let start_url = page.url();
        if (this.first) {
            let url : Promise<string>;
            if (this.show.number == 0) {
                debug("First time navigation to ", this.show.base_url, " for ", this.show.name);
                return Promise.resolve(this.show.base_url).then((url) => page.goto(url))            
                .then(() => {
                    this.first = false;
                    return page;
                });
            } else {
                return this.show.get_episode_page_url(this.show.number)
                    .tap((url) => debug("First run navigation to ", url, " for ", this.show.name))
                    .then((url) => page.goto(url))
                    .then(() => {
                        this.first = false;
                        return page;
                    })
                    .then(() => this.next(page));
            }
        }
        let xpath = this.show.next_xpath;
        return Promise.resolve(page.waitForXPath(xpath))
            .then((element) => 
                element.getProperty("href")
                .then((handle) => handle.jsonValue())
                .then((href) => {
                    debug("Navigating via goto for ", this.show.name, " to ", href);
                    return page.goto(href);
                })
                .catch(() => {
                    debug("Navigating via click for ", this.show.name)
                    return Promise.resolve(element.click()).delay(500);
                })
            )
            .then(() => page.bringToFront()).then(() => {
                if (page.url() == start_url) {
                    throw new Error("Navigation from " + start_url + " led to same page");
                }
            }).then(() => page)
    }

}

class NavigatorFactory {
    public getNavigator(show : Show) : Navigator {
        return new BasicNavigator(show);
    }
}

export default new NavigatorFactory();