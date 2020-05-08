import Downloader from "./Downloader";
import Resource from "./Resource";
import ResourceVisitor from "./ResourceVisitor";
import Episode from "../types/Episode";
import * as Promise from "bluebird";


class SimpleDownloader implements Downloader {
    private decorator : (episode : Episode) => void;

    constructor(decorator : (episode : Episode) => void) {
        this.decorator = decorator;
    }

    download(episode : Episode) : Promise<Episode> {
        this.decorator(episode);
        return Promise.resolve(episode);
    }
}


import * as magick from 'gm';
const gm : any = magick.subClass({imageMagick: true});
import { Database, Show } from "../data/Database";
import * as path from 'path';
import {downloadImage} from "./ImageUtil" ;
const debug = require('debug')('watcher-downloader-factory')
class ImageDownloader implements Downloader {

    private url : string;

    constructor(url : string) {
        this.url = url;
    }

    private createThumbnail(sourceFilename : string, targetFilename): Promise<void> {
            return new Promise((r, error) => {
                gm(sourceFilename)
                    .resize(100, 150)
                    .write(targetFilename, (e) => {
                        if (e) error(e);
                        else r();
                    });
            })
    }

    download(episode: Episode, show : Show): Promise<Episode> {
        debug("Downloading image", episode)
        let filename = episode.number + ".jpg";
        let thumbnailPath = path.join(show.thumbnail_dir, filename);
        return downloadImage(this.url, show.directory, episode.number + "", 5, episode.base_url)
            .tap(() => debug("Image downloaded creating thumbnail"))
            .then((filepath) => this.createThumbnail(filepath, thumbnailPath))
            .tap(() => debug("thumbnail created"))
            .then(() => episode);
    }

}

class DownloaderFactory implements ResourceVisitor<Downloader> {
    visitImage(url: string): Downloader {
        return new ImageDownloader(url);
    }
    visitTile(text: string): Downloader {
        return new SimpleDownloader((episode) => episode.data.title = text);
    }
    visitAltText(text: string): Downloader {
        return new SimpleDownloader((episode) => episode.data.alt_text = text);
    }
    visitDescription(text: string): Downloader {
        return new SimpleDownloader((episode) =>{
            if (!episode.data.text) {
                episode.data.text = [];
            }
            episode.data.text.push(text);
        });
    }
    public getDownloader(resource : Resource) : Downloader {
        return resource.accept(this);
    }
}

export default new DownloaderFactory();