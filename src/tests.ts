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
import * as fs from 'fs' ;
import RawShow from "./types/RawShow";
import { getBrowser } from "./downloaders/BrowserFactory";
import Navigator from "./downloaders/Navigator";
import ResourceExtractor from "./downloaders/ResourceExtractor";

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
    const browser : Browser = await getRequestBrowser();
    console.log("started")

    let show : any = <any>{
        "identifier": "sd",
        "name": "Skin Deep",
        "base_url": "http://www.skindeepcomic.com/reader-questions/2018-reader-question-98/",
        "logo": "http://www.skindeepcomic.com/wp-content/uploads/2011/08/wordpresslogo10251.jpg",
        "next_xpath": "//a[@rel='next']",
        "image_xpath": "//div[@class='webcomic-image scroll']//img",
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
  });

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

    let referenceConfiguration = fs.readFileSync("testpages/backup.json", "utf-8");

    let config : any[] = JSON.parse(referenceConfiguration);
    
    for (let i = 0; i < config.length; i++) {
        const show = config[i];
        
        show.interval = 30 * 60 * 1000;
        show.number = 1;
        show.directory = "./testTarget/" + show.identifier;
        show.thumbnail_dir =  "./testTarget/thumb/" + show.identifier;
        show.check_image_exists = () => Promise.resolve(false);
        show.insert_new_episode = (episode) => {
            console.log(episode);
            show.number = Math.max(episode.number, show.number);
            return Promise.resolve(episode);
        }
        show.get_episode_page_url = () => Promise.resolve(show.base_url);
        
        if (!fs.existsSync(show.directory)){
            fs.mkdirSync(show.directory);
        }

        if (!fs.existsSync(show.thumbnail_dir)){
            fs.mkdirSync(show.thumbnail_dir);
        }


        let nav : Navigator = NavigatorFactory.getNavigator(show);
        let res : ResourceExtractor = ResourceExtractorFactory.getResourceExtractor(show);

        let failedCount = 0;

        console.log("Starting: " + show.name);
        let a = await (getBrowser(show)
        .then((browser) => nav.next(browser))
        .then((browser)=>res.extract(browser).then((v) => {
            console.log("Got 1 ", JSON.stringify(v))
                if (v.length < 1) {
                    failedCount++;
                }
                return v;
            }).map(([episode, resources]) => {
                return Promise.reduce(resources, (episode ,resource : Resource) => DownloaderFactory.getDownloader(resource).download(episode, show), episode);
            }).all().return(browser))
        .then((browser) => nav.next(browser))
        .then((browser)=>res.extract(browser))
        .then((v) => {
            console.log("Got 2 ", JSON.stringify(v))
            if (v.length < 1) {
                failedCount++;
            }
            return v;
        })
        .map(([episode, resources]) => {
            return Promise.reduce(resources, (episode ,resource : Resource) => DownloaderFactory.getDownloader(resource).download(episode, show), episode);
        }).all().return("hello"))

        if (failedCount > 1) {
            throw new Error("Got nothing on " + show.name);
        }
        console.log("Ending: " + show.name);
    }
  })();