import * as Promise from 'bluebird' ;
import * as fs from 'fs' ;
import * as path from 'path' ;
import * as Nedb from 'nedb';
import * as shelljs from 'shelljs';
import RawShow from '../types/RawShow';
import ShowFields from '../types/Show';
import ShowData from '../types/ShowData';
import Episode from '../types/Episode' ;
import {downloadImage} from "../downloaders/ImageUtil";
import { ShowList } from '../front-end/ShowList';
const debug = require('debug')('watcher-database');
const qdebug = require('debug')('watcher-database-query');

const mkdir = Promise.promisify(fs.mkdir);

interface Config {
    shows: Map<string, Show>
}

const location: string = process.env.WATCHER_LOCATION;

interface DBShow {
    identifier : string,
    type : "show",
    data : RawShow
    new : number,
    reread : number
}

interface DBEpisodeData {
    image_url ?: string,
    image_location ?: string,
    title ?: string,
    alt_text ?: string,
    text ?: string[] 
}

interface DBEpisode {
    type : "episode",
    show : string,
    number : number,
    url ?: string,
    data : {
        image_url ?: string,
        image_location ?: string,
        title ?: string,
        alt_text ?: string,
        text ?: string[] 
    }
}

const defaults = {
    interval: 30 * 60 * 1000 //30 Minutes
}

function exec<T>(cursor : Nedb.Cursor<any>) : Promise<T[]> {
    return new Promise((resolve, reject) => {
        cursor.exec((err, docs) => {
            if (err) {
                qdebug("exec failed ", err);
                reject(err);
            } else {
                qdebug("exec returned ", docs);
                resolve(docs);
            }
        })
    })
}

function exec1<T>(cursor : Nedb.Cursor<any>) : Promise<T> {
    return exec<T>(cursor.limit(1)).any();
}

function insert(db : Nedb, data: any) : Promise<void> {
    return new Promise((resolve, reject) => {
        db.insert(data, (error, doc) => {
            if (error) {
                qdebug("insert failed ", error);
                reject(error);
            } else {
                qdebug("insert returned ", doc);
                resolve();
            }
        })
    })
} 

function update(db : Nedb, query: any, update : any, options ?: any) : Promise<number> {
    if (!options) options = {};
    return new Promise((resolve, reject) => {
        db.update(query, update, options, (error, number) => {
            if (error) {
                qdebug("update failed ", error);
                reject(error);
            } else {
                qdebug("update returned ", number);
                resolve(number);
            }
        })
    })
}

function remove(db : Nedb, query: any, options ?: { multi ?: boolean }) : Promise<number> {
    if (!options) options = {};
    return new Promise((resolve, reject) => {
        db.remove(query, options, (error, number) => {
            if (error) {
                qdebug("remove failed ", error);
                reject(error);
            } else {
                qdebug("remove returned ", number);
                resolve(number);
            }
        })
    })
}

export class Database {
    private static instance: Database = null;
    private static location: string = process.env.WATCHER_LOCATION;
    private config: Config = {
        shows: new Map()
    };
    public db: Nedb = null;
    private loaded: boolean = false;


    private constructor() {
    }


    public close = (): Promise<void> => {
        console.log("DATABASE CLOSED")
        this.loaded = false;
        Database.instance = null;
        return Promise.resolve();
    }

    private ensure_loaded = (): Promise<Config> => {
        return new Promise((r) => {
            if (!this.loaded) this.load_shows().then((shows) => {
                this.loaded = true;
                r(Database.get_storage_location()
                    .then((dir) => shelljs.mkdir('-p', dir))
                    .then(() => Promise.map(shows, this.perfrom_setup)
                        .return(this.config)));
            });
            else r(this.config);
        });
    }

    private load_shows = (): Promise<ShowFields[]> => {
        debug("loading shows")
        return this.get_pure_shows().map(this.resolve_show).tap(() => debug("Shows loaded"));
    }

    private resolve_show = (ritem: RawShow): Promise<ShowFields> => {
        let item: ShowFields = <ShowFields> ritem;
        return new Promise((resolve, reject) => this.db.find({type:"episode", show: item.identifier}).sort({number: -1}).limit(1).exec((e, rows: DBEpisode[]) => {
            if (rows.length == 0) {
                item.number = 0;
            } else {
                let row = rows[0];
                item.number = row.number;
                item.base_url = row.url;
                item.last_episode_url = row.data.image_url;
            }
            resolve(item);
        }));
    }

    private static get_storage_location = (): Promise<string> => {
        return Promise.resolve(Database.location);
    }

    private perfrom_setup = (rshow: ShowFields): Promise<Show> => {
        let show: Show = new Show(rshow);
        return Promise.resolve()
            .then(() => Database.resolve_path(path.join("shows", show.identifier)))
            .then((d) => {
                show.directory = d;
                return d
            })
            .then((dir) => shelljs.mkdir('-p', dir))
            .catch(console.error)
            .then(() => Database.resolve_path(path.join("shows", show.identifier, "thumbnails")))
            .then((d) => {
                show.thumbnail_dir = d;
                return d
            })
            .then((dir) => shelljs.mkdir('-p', dir))
            .catch(console.error)
            .then(() => {
                if (show.logo && !fs.existsSync(path.join(show.directory, "logo.jpg"))) {
                    return downloadImage(show.logo, show.directory, "logo")
                        .catch((e) => {
                            delete show.logo;
                        })
                        .return(show);
                }
                return show
            })
            .then(() => {
                this.config.shows.set(show.identifier, show);
                console.log(show.interval)
                return show;
            })
            .then(show.ensure_consistency)
            .return(show);
    }

    public static resolve_path = (filename: string): Promise<string> => {
        return Database.get_storage_location()
            .then((location) => path.resolve(location, filename));
    }

    public get_pure_shows = (): Promise<RawShow[]> => {
        return exec<DBShow>(this.db.find({type : "show"})).map((show : DBShow) => show.data);
    }

    public get_pure_show = (identifier: string): Promise<RawShow> => {
        return exec<DBShow>(this.db.find({type : "show", identifier : identifier}).limit(1)).any().then((show : DBShow) => show.data);
    }

    public get_show_data = (identifier: string): Promise<ShowData> => {
        let data: ShowData = <ShowData> {};
        data.identifier = identifier;
        return exec<DBShow>(this.db.find({type : "show", identifier : identifier}).limit(1)).any()
        .then((row : DBShow) => {
                data.new = row.new;
                data.reread = row.reread;
            })
            .then(() => this.get_show(identifier))
            .then((show: ShowFields) => {
                if (show) {
                    data.episode_count = show.number;
                    data.name = show.name;
                    data.type = show.type;
                    data.logo = show.logo;
                    data.image_xpath = show.image_xpath;
                    data.next_xpath = show.next_xpath;
                    data.text_xpath = show.text_xpath;
                }
            })
            .return(data);
    }


    public get_shows = (): Promise<Show[]> => {
        return Promise.resolve(Array.from(this.config.shows.values()));
    }

    public get_show = (identifier: string): Promise<Show> => {
        let show = this.config.shows.get(identifier)
        if (show) {
            return Promise.resolve(show);
        } else {
            return Promise.reject(new Error("ShowFields does not exist"));
        }

    }

    public static init = (path: string): Promise<Config> => {
        if (!Database.instance) {
            Database.instance = new Database();
        } else {
            return Promise.reject(new Error("Database already initalized"));
        }
        return Database.resolve_path(path)
            .then((full_path) => new Nedb({ filename: full_path, autoload: true }))
            .then((sql) => Database.instance.db = sql)
            .tap(() => debug("Database created"))
            .then(Database.instance.ensure_loaded);
    }

    public static getInstance = (): Promise<Database> => {
        if (Database.instance) {
            return Promise.resolve(Database.instance);
        } else {
            return Promise.reject(new Error("Database not initalized"));
        }
    }

    private insert_new_show = (data: RawShow): Promise<RawShow> => {
        let show : DBShow = {
            type : "show",
            identifier : data.identifier,
            data : data,
            new : 0,
            reread : 0
        }
        return insert(this.db, show).return(data);
    }


    public start_show = (identifier: string): Promise<ShowFields> => {
        return exec<DBShow>(this.db.find({type: "show", identifier : identifier}).limit(1)).any()
            .then((r: DBShow) => r.data)
            .then(this.resolve_show)
            .then(this.perfrom_setup)
            .then(manager.add_watcher);

    }

    public add_new_show = (show: RawShow): Promise<Show> => {
        return this.get_pure_show(show.identifier).catch((or) => null)
            .then((os) => {
                //Don't update if no chnages have been made
                if (os && Object.keys(show).every((k) => os[k] == show[k])
                    && Object.keys(os).every((k) => os[k] == show[k])) {
                    return this.get_show(show.identifier);
                } else {
                    return this.get_show(show.identifier)
                        .then((show) => show.delete_show())
                        .catch(() => null)
                        .then(() => this.insert_new_show(show))
                        .then(() => this.start_show(show.identifier))
                        .then(() => this.get_show(show.identifier));
                }
            })
    }

    public deregister_show = (identifier: string): Database => {
        this.config.shows.delete(identifier);
        return this;
    }
}


export class Show implements ShowFields {
    interval: number;
    directory: string;
    thumbnail_dir: string;
    number: number;
    last_episode_url: string;
    identifier: string;
    name: string;
    type: string;
    logo?: string;
    base_url: string;
    next_xpath: string;
    image_xpath: string;
    text_xpath: string;
    requireJS ?: boolean;

    constructor(base_show: ShowFields) {
        this.interval = base_show.interval ? base_show.interval : defaults.interval;
        this.directory = base_show.directory;
        this.thumbnail_dir = base_show.thumbnail_dir;
        this.number = base_show.number;
        this.last_episode_url = base_show.last_episode_url;
        this.identifier = base_show.identifier;
        this.name = base_show.name;
        this.type = base_show.type;
        this.logo = base_show.logo;
        this.base_url = base_show.base_url;
        this.next_xpath = base_show.next_xpath;
        this.image_xpath = base_show.image_xpath;
        this.text_xpath = base_show.text_xpath;
        this.requireJS = base_show.requireJS;
    }


    public ensure_consistency = (): Promise<ShowFields> => {
        return Database.getInstance().then(db => db.get_show_data(this.identifier))
            .then((data) => {
                return ["new", "reread"].map((type) => {
                    if (data[type] > this.number) {
                        return this.update_last_read(this.number, type)
                    } else {
                        return null;
                    }
                })
            })
            .all()
            .return(this);
    }

    public get_show_data = (): Promise<ShowData> => {
        let data: ShowData = <ShowData> {};
        data.identifier = this.identifier;
        return Database.getInstance().then(db => exec1<DBShow>(db.db.find({type : "show", identifier : this.identifier})))
            .then((sdata : DBShow) => {
                data.new = sdata.new;
                data.reread = sdata.reread;
                data.episode_count = this.number;
                data.name = this.name;
                data.type = this.type;
                data.logo = this.logo;
                data.image_xpath = this.image_xpath;
                data.next_xpath = this.next_xpath;
                data.text_xpath = this.text_xpath;
            })
            .return(data);
    }

    public update_last_read = (number: number, type: string): Promise<any> => {
        if (type != "new")
            return Database.getInstance().then(db => update(db.db, {type : "show", identifier : this.identifier}, {
                $set :{reread : Math.min(this.number, number) }
            }))
        else return Database.getInstance().then(db => update(db.db, {type : "show", identifier : this.identifier}, {
            $max :{new : Math.min(this.number, number) }
        }))
    }

    public delete_show = (): Promise<void> => {
        return Database.getInstance().then(db => db.deregister_show(this.identifier))
            .then(db => manager.stop_watcher(this.identifier)
                .then(() => remove(db.db, {type : "show", identifier : this.identifier}))
                .then(() => remove(db.db, {type : "episode", show : this.identifier}, {multi : true}))
                .then(() => shelljs.rm("-rf", this.directory))
                .catch(console.error)
            );
    }

    public restart_from = (episode: number, new_url: string, next_xpath: string,
                           image_xpath: string, text_xpath: string): Promise<string> => {
        debug("restarting show", this.identifier, " from ", episode);
        return this.get_show_data()
            .then(data => {
                return Database.getInstance().then(db =>
                    Promise.resolve()
                        .then(() => db.deregister_show(this.identifier))
                        .then(() => manager.stop_watcher(this))
                        .then()
                        .then(() =>remove(db.db, {type : "episode", show : this.identifier, number : {$gt : episode}}, {multi : true}))
                        .tap((n) => debug("deleted ", n, "episodes"))
                        .then(() => update(db.db, {type : "show", identifier : this.identifier}, {
                            $min :{reread : episode }
                        }))
                        .tap((n) => debug("show is now after new update", n))
                        .then(() => update(db.db, {type : "show", identifier : this.identifier}, {
                            $min : {new : episode }
                        }))
                        .tap((n) => debug("show is now after reread update", n))
                        .then(() => {
                            if (new_url) {
                                return update(db.db, {type : "episode", show : this.identifier, number: episode}, {
                                    $set :{url : new_url }
                                }).tap((n) => debug("episode is now", n))
                            }
                        })
                        .then(() => {
                            if (next_xpath || image_xpath || text_xpath) {
                                return Database.getInstance()
                                    .then((db) => db.get_pure_show(this.identifier)
                                        .then((pure_data) => {
                                            if (next_xpath) pure_data.next_xpath = next_xpath;
                                            if (image_xpath) pure_data.image_xpath = image_xpath;
                                            if (text_xpath) pure_data.text_xpath = text_xpath;
                                            return update(db.db, {type : "show", identifier : this.identifier}, {
                                                $set :{data : pure_data }
                                            })}).return(this.identifier));
                            } else {
                                return this.identifier;
                            }
                        })
                        .catch(console.error)
                        .then(() => db.start_show(this.identifier))
                        .return(this.identifier)
                );
            })
    }


    public insert_new_episode = (data: Episode): Promise<Episode> => {
        var aditional_data : DBEpisodeData = {};
        if ('data' in data) aditional_data = data.data;
        aditional_data.image_url = data.url;
        let ep : DBEpisode = {
            type : "episode",
            show : this.identifier,
            number : data.number,
            url : data.base_url,
            data : aditional_data
        }

        return Database.getInstance()
            .then(db => insert(db.db, ep))
            .then(() => {
                if (this.number < data.number) {
                    this.number = data.number;
                    this.last_episode_url = data.url;
                    this.base_url = data.base_url;
                }
            })
            .return(data);
    }

    private episodePostParse(resp : DBEpisode) : Promise<Episode>{
            return new Promise((r, e) => {
                    if (!resp || !resp.show) {
                        e(new Error("Query failed - Could not find episode"));
                        return;
                    }
                    let result: Episode = {
                        identifier: resp.show,
                        number: resp.number,
                        url: resp.data.image_url,
                        base_url: resp.url,
                        thumbnail_name: "shows/" + resp.show + "/thumbnails/" + resp.number + ".jpg",
                        filename : "shows/" + resp.show + "/" + resp.number + ".jpg",
                        data: resp.data
                    }
                    r(result);
         });
        
    }

    public get_episode_data = (episode_number: number): Promise<Episode> => {
        return Database.getInstance().then(db => exec1<DBEpisode>(db.db.find({type : "episode", show : this.identifier, number : episode_number}))
            .then((resp) => this.episodePostParse(resp)))
    }

    public get_episode_page_url = (episode_number: number): Promise<string> => {
        return this.get_episode_data(episode_number)
            .then((episode) => episode.base_url);
    }
    public get_first = (): Promise<Episode> => {
        return Database.getInstance().then(db => exec1<DBEpisode>(db.db.find({type : "episode", show : this.identifier}).sort({number : 1}))
            .then((resp) => this.episodePostParse(resp)));
    }

    public get_last = (): Promise<Episode> => {
        return Database.getInstance().then(db => exec1<DBEpisode>(db.db.find({type : "episode", show : this.identifier}).sort({number : -1}))
            .then((resp) => this.episodePostParse(resp)));

    }

    public get_next = (episode_number: number): Promise<Episode> => {
        return Database.getInstance().then(db => exec1<DBEpisode>(db.db.find({type : "episode", show : this.identifier, number : {$gt : episode_number}}).sort({number : 1})))
            .then((resp) => this.episodePostParse(resp)).catch((e) => this.get_episode_data(episode_number)).catch(() => undefined);
    }


    public get_prev = (episode_number: number): Promise<Episode> => {
        return Database.getInstance().then(db => exec1<DBEpisode>(db.db.find({type : "episode", show : this.identifier, number : {$lt : episode_number}}).sort({number : -1})))
            .then((resp) => this.episodePostParse(resp)).catch((e) => this.get_episode_data(episode_number)).catch(() => undefined);
    }

    public get_last_unread = (type: string): Promise<Episode> => {
        return this.get_show_data()
            .then((show_data) => show_data[type])
            .then((episode: number) => this.get_next(episode));
    }

    public deleteEpiosde(index : number) : Promise<any> {
        debug("Trying to delete episode", index, " for show ", this.name);
        return this.get_episode_data(index).tap(v => debug("Got epiosde for deletion", v)).then((episode) => [
                Database.getInstance().then(db => remove(db.db, {type : "episode", show : this.identifier, number : episode.number})).tap((v) => debug("Deleted epiosde ", v)),
                Promise.all([Database.resolve_path(episode.filename), Database.resolve_path(episode.thumbnail_name)]).map((file : string) => shelljs.rm(file))
            ]).all();
    }

    public check_image_exists = (image_url: string): Promise<boolean> => {
        return Database.getInstance().then(db => exec1<DBEpisode>(db.db.find({type : "episode", show : this.identifier, "data.image_url" : image_url}))).catch(() => false).then((s) => !!s);
    }

}

const manager = require('./../downloaders/manager');
