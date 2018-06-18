import { Page } from "puppeteer";
import { Show } from "../data/Database";
import * as Promise from 'bluebird';
import { setInterval } from "timers";
import NavigatorFactory from "./NavigatorFactory";
import Navigator from "./Navigator";
import ResourceExtractor from "./ResourceExtractor";
import Resource from "./Resource";
import DownloaderFactory from "./DownloaderFactory";
import Episode from "../types/Episode";


export class Watcher {
    pageProvider : () => Promise<Page>;
    show : Show;
    currentRun : Promise<void>;
    interval : NodeJS.Timer;

    constructor(pageProvider : () => Promise<Page>, show : Show) {
        this.pageProvider = pageProvider;
        this.show = show;

        this.cycle = this.cycle.bind(this);
    }

    private singleCycle(navigator : Navigator, resourceExtractor : ResourceExtractor) : (page : Page) => Promise<Page> {
        return (page) => navigator.next(page)
            .then((page) => resourceExtractor.extract(page))
            .map(([episode, resources] : [Episode, Resource[]]) => 
                Promise.all(resources.map((resource) => DownloaderFactory.getDownloader(resource).download()))
                .reduce((ep , f : (ep : Episode) => Episode) => f(episode), episode)                
            )
            .map((episode : Episode) => this.show.insert_new_episode(episode))
            .then(() => page);
    }

    private cycleLoop(navigator : Navigator, resourceExtractor : ResourceExtractor) : (page : Page) => Promise<Page> {
        let itteration = this.singleCycle(navigator, resourceExtractor);
        let f = <any> ((func) => (page) => itteration(page).then(() => func(func)(page)));
        return (page : Page) => f(f)(page);
    }

    private cycle() : Promise<void> {
        return this.currentRun =  this.pageProvider().then((page) => {
            let navigator : Navigator = NavigatorFactory.getNavigator(this.show);
            let resourceExtractor : ResourceExtractor = null;

            return this.cycleLoop(navigator, resourceExtractor)(page)
                .then(() => Promise.resolve(page.close()));
        });
    }

    public start() {
        this.cycle().then(() => {
            this.interval = setInterval(this.cycle, this.show.interval);
        })
    }

    public stop() {
        clearInterval(this.interval);
        this.currentRun.cancel();
    }
}