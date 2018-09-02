//This is basically just a  test file that can be run to confirm that the components mostly function
//Basically I'll just be copying the JIT tests that I've written into here

import * as puppeteer from "puppeteer";
import ResourceExtractorFactory from "./downloaders/ResourceExtractorFactory";
import NavigatorFactory from "./downloaders/NavigatorFactory";
import DownloaderFactory from "./downloaders/DownloaderFactory";
import * as Promise from "bluebird";
import Episode from "./types/Episode";
import Resource from "./downloaders/Resource";
import { Watcher } from "./downloaders/Watcher";
import { Show } from "./data/Database";
import { PuppeteerBrowser, getPuppeteerBrowser } from "./downloaders/PuppeteerBrowser";
import { RequestBrowser, getRequestBrowser } from "./downloaders/RequestBrowser";
import { Browser } from "./downloaders/Browser";

let watcher : Watcher = null;
function getWatcher() {
    return watcher;
}

(async () => {
    const browser = await getPuppeteerBrowser(false);

    let show : any = <any>    {
        "identifier": "gg",
        "name": "Girl Genious",
        "base_url": "http://www.girlgeniusonline.com/comic.php?date=20180806",
        "logo": "http://www.girlgeniusonline.com/downloads/cocoamac1.jpg",
        "next_xpath": "//a[@id='topnext']",
        "image_xpath": "//div[@id='comicbody']//img",
        "type": "webcomic"
    }

    let nav = await NavigatorFactory.getNavigator(show);

    await nav.next(browser);
    await ResourceExtractorFactory.getResourceExtractor(show).extract(browser)
    .map(([episode, res] : [Episode, Resource[]]) => Promise.reduce(res , (episode, r ) => DownloaderFactory.getDownloader(r).download(episode, show), episode))
    .all()
    .then(console.log)
    .then(() => nav.next(browser))
    .delay(5000)
    .finally(() => browser.close());
  });

  (async () => {
    console.log("starting")
    const browser : Browser = await getPuppeteerBrowser(false);
    console.log("started")

    let show : any = <any>{
        "identifier": "gg",
        "name": "Girl Genious",
        "base_url": "http://www.girlgeniusonline.com/comic.php?date=20180806",
        "logo": "http://www.girlgeniusonline.com/downloads/cocoamac1.jpg",
        "next_xpath": "//a[@id='topnext']",
        "image_xpath": "//div[@id='comicbody']//img",
        "type": "webcomic",
        interval: 30 * 60 * 1000,
        number : 1,
        directory : "./testTarget",
        thumbnail_dir : "./testTarget/thumb",
        check_image_exists : () => Promise.resolve(false)
    }

    show.insert_new_episode = (episode) => {
        console.log(episode);
        show.number = episode.number;
        return Promise.resolve();
    }

    show.get_episode_page_url = () => Promise.resolve(show.base_url);


    watcher = new Watcher(() => Promise.resolve(browser).disposer(page => {
        browser.close()
        getWatcher().stop();
    }), show);
    watcher.start();
  })();