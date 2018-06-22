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
import ResourceExtractorFactory from "./ResourceExtractorFactory";
const debug = require('debug')('watcher-watcher')

Promise.config({
    cancellation: true
});

export class Watcher {
    pageProvider : () => Promise.Disposer<Page>;
    show : Show;
    currentRun : Promise<void>;
    interval : Promise<void>;
    currentRunStarted : false;

    constructor(pageProvider : () => Promise.Disposer<Page>, show : Show) {
        this.pageProvider = pageProvider;
        this.show = show;

        this.cycle = this.cycle.bind(this);
    }

    private singleCycle(navigator : Navigator, resourceExtractor : ResourceExtractor) : (page : Page) => Promise<Page> {
        return (page) => navigator.next(page)
            .then((page) => resourceExtractor.extract(page))
            .map(([episode, resources] : [Episode, Resource[]]) => 
                Promise.reduce(resources, (episode ,resource) => DownloaderFactory.getDownloader(resource).download(episode, this.show), episode)            
            )
            .map((episode : Episode) => this.show.insert_new_episode(episode))
            .then(() => console.log("CONTINUING " + this.show.name + " AT EPISODE " + this.show.number))
            .then(() => page);
    }

    private cycleLoop(navigator : Navigator, resourceExtractor : ResourceExtractor) : (page : Page) => Promise<Page> {
        let itteration = this.singleCycle(navigator, resourceExtractor);
        let f = <any> ((func) => (page) => itteration(page).then(() => func(func)(page)));
        return (page : Page) => f(f)(page);
    }

    private cycle() : void {
        if (this.currentRun) this.currentRun.cancel();
        this.currentRun =  Promise.using(this.pageProvider(), (page) => {
            this.interval = Promise.delay(this.show.interval).then(this.cycle);
            let navigator : Navigator = NavigatorFactory.getNavigator(this.show);
            let resourceExtractor : ResourceExtractor = ResourceExtractorFactory.getResourceExtractor(this.show);

            return this.cycleLoop(navigator, resourceExtractor)(page)
                .catch((e) => {
                    debug("STOPPING DUE TO ", e);
                    console.log("STOPING " + this.show.name + " AT EPISODE " + this.show.number);
                })
                .then();
        });
    }

    public start() : void{
        this.cycle();
    }

    public stop() : void {
        this.interval.cancel();
        this.currentRun.cancel();
    }
}