import Link from '../link/FrontLink';
import ShowCach from './show-data-loader';
import Episode from '../types/FrontEndEpisode';
import ShowData from '../types/ShowData';
import * as Promise from 'bluebird';



class EpisodeNavigator {
    private static DIRECTIONS : string[] = ["next","prev","current","last","first"]

    private preloads : Map<string,Episode> = new Map();
    private current_show: ShowData = null;
    private type : string = null;
    private callbacks: Map<string, (episode : Episode) => void> = new Map();
    
    
    private update(direction : string) : Promise<Episode> {
        let current = this.preloads.get("current");

        return Link.getRelativeEpisode(this.current_show.identifier, current ? current.number : this.current_show[this.type], direction)
        .then((data) => {
                if (this.current_show && this.current_show.identifier == data.identifier) {
                    data.img = new Image();
                    data.img.src = data.src;
                    this.setEpisode(direction, data);
                }
                return data;
        }).catch((e) => {
            console.log(e);
            throw e;
            
        });
    }

    private setEpisode(direction : string, episode : Episode) {
        this.preloads.set(direction, episode);
        if (direction == "current") {
            this.callbacks.forEach((callback) => callback(episode));
        }    
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
                this.preloads = new Map();
                EpisodeNavigator.DIRECTIONS.forEach((direction) => this.update(direction));
            } else {
                let last : Episode = this.preloads.get("last")
                if (last && last.number != show.episode_count) {
                    this.update("last");
                }
            }
        });
    }

    private setCurrent(episode : Episode) : void{
        if (episode) {
            this.setEpisode("current", episode);
            EpisodeNavigator.DIRECTIONS.slice(0,2).forEach((dir) => this.update(dir));
            Link.updateLastRead(this.current_show.identifier, episode.number, this.type);
        }
    }

    public navigate(direction : string) : void {
        if (this.preloads.get(direction)) {
            this.setCurrent(this.preloads.get(direction));
            Link.updateLastRead(this.current_show.identifier, this.preloads.get(direction).number, this.type)
        } else {
            this.update(direction).then((episode) => this.setCurrent(episode));
        }
    }

    public registerCallback(key : string, callback : (current : Episode) => void) : void {
        this.callbacks.set(key, callback);
        callback(this.preloads.get("current"));
    }

    public removeCallback(key : string) : void {
        this.callbacks.delete(key);
    }

}

export default new EpisodeNavigator();

