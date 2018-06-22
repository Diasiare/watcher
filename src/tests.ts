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

let watcher : Watcher = null;
function getWatcher() {
    return watcher;
}

(async () => {
    const browser = await puppeteer.launch({
        headless : false,
    });
    const page = await browser.newPage();

    let show : any = <any>{
        image_xpath : "//div[@id=\'imgholder\']/a/img",
        number : 0,
        base_url : 'https://www.mangareader.net/naruto-gaiden-the-seventh-hokage/10/20',
        next_xpath : "//div[@id='imgholder']/a",
        directory : "./testTarget",
        thumbnail_dir : "./testTarget/thumb"
    }

    let nav = await NavigatorFactory.getNavigator(show);

    await nav.next(page);
    await ResourceExtractorFactory.getResourceExtractor(show).extract(page)
    .map(([episode, res] : [Episode, Resource[]]) => Promise.reduce(res , (episode, r ) => DownloaderFactory.getDownloader(r).download(episode, show), episode))
    .all()
    .then(console.log)
    .then(() => nav.next(page))
    .delay(5000)
    .finally(() => browser.close());
  });

  (async () => {
    console.log("starting")
    const browser = await puppeteer.launch({
        headless : false
    });
    const page = await browser.newPage();
    console.log("started")

    let show : any = <any>{
        "identifier":"sin",
        "name":"Sin Fest",
        "base_url":"http://www.sinfest.net/view.php?date=2018-06-21",
        "logo":"http://www.sinfest.net/images/bright_sinfest.gif",
        "next_xpath":"//a[img[@src='../images/next.gif']]",
        "image_xpath":"//tbody[@class='style5']//img",
        "type":"webcomic",
        interval: 30 * 60 * 1000,
        number : 0,
        directory : "./testTarget",
        thumbnail_dir : "./testTarget/thumb",
        check_image_exists : () => Promise.resolve(false)
    }

    show.insert_new_episode = (episode) => {
        console.log(episode);
        show.number = episode.number;
        return Promise.resolve();
    }

    watcher = new Watcher(() => Promise.resolve(browser.newPage()).disposer(page => {
        browser.close()
        getWatcher().stop();
    }), show);
    watcher.start();
  })();