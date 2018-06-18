import equal =  require('deep-equal');
import ShowData from '../types/ShowData';

class ShowDataCache {
    private static TIME_BETWEEN_UPDATES : number = 60 * 1000;
    private listeners : Map<string, (data : ShowData[]) => void>= new Map();
    private show_listeners : Map<string, Map<string, (data : ShowData) => void>> = new Map();
    private data : Map<string, ShowData> = new Map()

    public constructor() {
        Link.getShowsData().each((show : ShowData) => this.data.set(show.identifier, show))
            .then((shows : ShowData[]) => this.doAllShowsCallbacks(shows))
            .each((show : ShowData) => this.doSingleShowCallback(show));

         setInterval(() => this.fetchAll(),  ShowDataCache.TIME_BETWEEN_UPDATES);
    }

    public fetchAll() : void {
        Link.getShowsData().then((shows) => {
            let oldShows = this.data;

            this.data = new Map();
            shows.forEach((show) => {
                this.data.set(show.identifier, show)
                if (!equal(show, oldShows.get(show.identifier))) {
                    this.doSingleShowCallback(show);
                }
            });

            oldShows.forEach((show, identifier) => {
                if (!this.data.has(identifier)) {
                    this.removeShow(identifier);
                }
            })

            this.doAllShowsCallbacks(shows);
        })
    }

    private doAllShowsCallbacks(shows : ShowData[]) : ShowData[] {
        this.listeners.forEach((callback) => callback(shows));
        return shows;
    }

    private doSingleShowCallback(show : ShowData) : ShowData {
        let listeners = this.show_listeners.get(show.identifier);
        if (listeners) {          
            listeners.forEach((callback) => callback(show));
        }
        return show
    }

    private removeShow(identifier : string) : void {
        this.data.delete(identifier);
        this.show_listeners.get(identifier)
            .forEach((callback) => callback(null));
        this.show_listeners.delete(identifier);
    }

    public registerAllShowsCallback(key : string, callback : (data : ShowData[]) => void) {
        this.listeners.set(key, callback);
        callback(Array.from(this.data.values()));
    }

    public registerSingleShowCallback(identifier : string, key : string, callback : (data : ShowData) => void) {
        let listenersForShow : Map<string, (data : ShowData) => void> = this.show_listeners.get(identifier);

        if (!listenersForShow) {
            listenersForShow = new Map();
            this.show_listeners.set(identifier, listenersForShow)
        }
        listenersForShow.set(key, callback);
        callback(this.data.get(identifier));
    }

    public removeAllShowsCallback(key : string) {
        this.listeners.delete(key);
    }

    public removeSingleShowCallback(key : string) {
        this.show_listeners.forEach((listeners) => listeners.delete(key));
    }

    public updateShow(identifier : string, updater : (data : ShowData) => ShowData) {
        let newShowData = updater(JSON.parse(JSON.stringify(this.data.get(identifier))));
        if (newShowData) {
            this.data.set(identifier, newShowData);
            this.doAllShowsCallbacks(Array.from(this.data.values()));
            this.doSingleShowCallback(newShowData);            
        } else {
            this.removeShow(identifier);
        }

    }
}

import Link from '../link/FrontLink';
const cashe : ShowDataCache = new ShowDataCache();

export default cashe;

