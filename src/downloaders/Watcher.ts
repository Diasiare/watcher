import { Show } from "../data/Database";
import * as Promise from 'bluebird';
import NavigatorFactory from "./NavigatorFactory";
import Navigator from "./Navigator";
import ResourceExtractor from "./ResourceExtractor";
import Resource from "./Resource";
import DownloaderFactory from "./DownloaderFactory";
import Episode from "../types/Episode";
import ResourceExtractorFactory from "./ResourceExtractorFactory";
import { Browser } from "./Browser";
const debug = require('debug')('watcher-watcher')

Promise.config({
    cancellation: true
});

export class Watcher {
    browserProvider : () => Promise.Disposer<Browser>;
    show : Show;
    currentRun : Promise<void>;
    interval : Promise<void>;
    currentRunStarted : false;

    constructor(browserProvider : () => Promise.Disposer<Browser>, show : Show) {
        this.browserProvider = browserProvider;
        this.show = show;

        this.cycle = this.cycle.bind(this);
    }

    private singleCycle(navigator : Navigator, resourceExtractor : ResourceExtractor) : (browser : Browser) => Promise<Browser> {
        return (browser) => navigator.next(browser)
            .then((browser) => resourceExtractor.extract(browser))
            .then(async (input : [Episode, Resource[]][]) => {
                let outEps = [];
                for (let i = 0; i < input.length; i++) {
                    let [episode, resources] = input[i];
                    const outEp = await Promise.reduce(resources, (episode ,resource) => 
                        DownloaderFactory.getDownloader(resource).download(episode, this.show), episode);
                    outEps.push(outEp);
                }
                return outEps;
            })
            .tap((episode) => debug("Inserting epiosde", episode))
            .map((episode : Episode) => this.show.insert_new_episode(episode))
            .then(() => console.log("CONTINUING " + this.show.name + " AT EPISODE " + this.show.number))
            .then(() => browser);
    }

    private cycleLoop(navigator : Navigator, resourceExtractor : ResourceExtractor) : (browser : Browser) => Promise<void> {
        let itteration = this.singleCycle(navigator, resourceExtractor);
        return  (browser : Browser) => Promise.resolve((async () => {
            while (true) {
                browser = await itteration(browser);
            }
        })());
    }

    private cycle() : void {
        if (this.currentRun) this.currentRun.cancel();
        this.currentRun =  Promise.using(this.browserProvider(), (browser) => {
            this.interval = Promise.delay(this.show.interval).then(this.cycle);
            let navigator : Navigator = NavigatorFactory.getNavigator(this.show);
            let resourceExtractor : ResourceExtractor = ResourceExtractorFactory.getResourceExtractor(this.show);

            return this.cycleLoop(navigator, resourceExtractor)(browser)
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