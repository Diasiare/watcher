import Link from '../link/FrontLink';
import ShowCach from './ShowDataCache';
import Episode from '../types/FrontEndEpisode';
import ShowData from '../types/ShowData';
import * as Promise from 'bluebird';



class EpisodeNavigator {
    private static DIRECTIONS : string[] = ["next","prev","current","last","first"]

    private preloads : Map<string,Episode[]> = new Map();
    private current_show: ShowData = null;
    private type : string = null;
    private callbacks: Map<string, (episode : Episode[]) => void> = new Map();
    private pageMode: boolean = false;
    
    
    private update(direction : string) : Promise<Episode[]> {
        let current = this.get("current");
        let episode_number = this.current_show[this.type];
        if (current && current.length > 0) {
            if (direction == "next") {
                episode_number = current[current.length - 1].number;
            } else {
                episode_number = current[0].number;
            }
        }
        const episodePromise = Link.getRelativeEpisode(this.current_show.identifier, episode_number , direction);
        let episodesPromise : Promise<Episode[]>;
        if (this.pageMode) {
            episodesPromise = episodePromise.then(episode => Link.getSamePageEpisodes(this.current_show.identifier, episode.number));
        } else {
            episodesPromise = episodePromise.then(episode => [episode]);
        }
        return episodesPromise
            .map((episode : Episode) => {
                episode.img = new Image();
                episode.img.src = episode.src;
                return episode;        
            })
            .then((data) => {
                if (this.current_show && data.length > 0 &&this.current_show.identifier == data[0].identifier) {
                    this.setEpisode(direction, data);
                }
                return data;
            }).catch((e) => {
                console.log(e);
                throw e;
            });
    }

    private setEpisode(direction : string, episode : Episode[]) {
        this.preloads.set(direction, episode);
        if (direction == "current") {
            this.callbacks.forEach((callback) => callback(episode));
        }    
    }

    private get(direction : string) : Episode[] {
        const r = this.preloads.get(direction);
        return r ? r : [];
    }


    public changeShow(identifier : string, type : string) : void {
        let oldType = this.type;
        this.type = type;
        this.callbacks.forEach((callback) => callback(null));
        ShowCach.removeSingleShowCallback("ImagePreloader");
        ShowCach.registerSingleShowCallback(identifier, "ImagePreloader", (show) => {
            let oldIdentifier = this.current_show ? this.current_show.identifier : null;
            this.current_show = show;
            if (!show) {
                return;
            }
            if (oldIdentifier != show.identifier || this.type != oldType) {
                oldType = this.type;
                this.preloads = new Map();
                EpisodeNavigator.DIRECTIONS.forEach((direction) => this.update(direction));
            } else {
                const lasts : Episode[] = this.get("last")
                const last = lasts[lasts.length -1];
                if (last && last.number != show.episode_count) {
                    this.update("last");
                }
            }
        });
    }

    private unload() : void {
        ShowCach.removeSingleShowCallback("ImagePreloader");
        this.current_show = null;
    }

    private setCurrent(episodes : Episode[]) : void {
        if (episodes) {
            this.setEpisode("current", episodes);
            EpisodeNavigator.DIRECTIONS.slice(0,2).forEach((dir) => this.update(dir));
            Link.updateLastRead(this.current_show.identifier, episodes[0].number, this.type);
        }
    }

    public navigate(direction : string) : void {
        this.setCurrent(this.get(direction));
    }

    public registerCallback(key : string, callback : (current : Episode[]) => void) : void {
        this.callbacks.set(key, callback);
        callback(this.get("current"));
    }

    public removeCallback(key : string) : void {
        this.callbacks.delete(key);
        if (this.callbacks.size == 0) {
            this.unload();
        }
    }

    public setPageMode(pageMode : boolean) {
        if (this.pageMode != pageMode) {
            this.pageMode = pageMode;
            EpisodeNavigator.DIRECTIONS.forEach(dir => this.update(dir));
        }
    }

    public getPageMode() : boolean {
        return this.pageMode;
    }

}

export default new EpisodeNavigator();

