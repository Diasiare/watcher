import * as Promise from 'bluebird';
import * as fs from 'fs';
import * as path from 'path';
import * as shelljs from 'shelljs';
import * as sqlite from 'sqlite';
import RawShow from '../types/RawShow';
import ShowFields from '../types/Show';
import ShowData from '../types/ShowData';
import Episode from '../types/Episode';
import { downloadImage } from "../downloaders/ImageUtil";
import { Configuration, loadConfiguration } from "../configuration/Configuration";
const debug = require('debug')('watcher-database-databse');

const mkdir = Promise.promisify(fs.mkdir);

interface Config {
    shows: Map<string, Show>,
    showConfig: Configuration.Configurations,
}

const location: string = process.env.WATCHER_LOCATION;
const configLocation: string = process.env.WATCHER_CONFIG ? process.env.WATCHER_CONFIG : "./default-configuration.json";


const model = {
    shows: `identifier TEXT NOT NULL PRIMARY KEY,
    data TEXT
    `,
    episodes: `show TEXT NOT NULL REFERENCES shows(identifier) ON DELETE CASCADE,
    number INT NOT NULL,
    image_url TEXT NOT NULL,
    page_url TEXT NOT NULL,
    aditional_data TEXT,
    CONSTRAINT episodes_pkey PRIMARY KEY (show,number) ON CONFLICT REPLACE
    `,
    last_read: `show TEXT NOT NULL REFERENCES shows(identifier) ON DELETE CASCADE,
    type TEXT NOT NULL,
    number INT NOT NULL,
    CONSTRAINT unread_pkey PRIMARY KEY(show,type) ON CONFLICT REPLACE
    `
}

const defaults = {
    interval: 30 * 60 * 1000 //30 Minutes
}


export class Database {
    private static instance: Database = null;
    private static location: string = process.env.WATCHER_LOCATION;
    private static configLocation: string = process.env.WATCHER_CONFIG ? process.env.WATCHER_CONFIG : "./default-configuration.json";
    private config: Config = {
        shows: new Map(),
        showConfig: null
    };
    public db: sqlite.Database = null;
    private loaded: boolean = false;



    private constructor() {
    }


    public close = (): Promise<void> => {
        console.log("DATABASE CLOSED")
        this.loaded = false;
        Database.instance = null;
        return Promise.resolve(this.db.close());
    }

    private create_tables = (): Promise<any> => {
        return Promise.each(Object.keys(model), (t_name) => {
            return this.db.exec("CREATE TABLE IF NOT EXISTS " + t_name + " ( " + model[t_name] + " )");
        }
        );
    }

    private ensure_loaded = (): Promise<Config> => {
        if (!this.loaded) return loadConfiguration(Database.configLocation)
            .then(showConf => {
                debug("loaded configuration", showConf);
                this.config.showConfig = showConf;
            }).then(() => this.load_shows()).then((shows) => {
                this.loaded = true;
                return Database.get_storage_location()
                    .then((dir) => shelljs.mkdir('-p', dir))
                    .then(() => Promise.map(shows, this.perfrom_setup)).all();
            }).return(this.config);
        else return Promise.resolve(this.config);

    }

    private load_shows = (): Promise<ShowFields[]> => {
        return this.get_pure_shows().map(this.resolve_show);
    }

    private resolve_show = (ritem: RawShow): Promise<ShowFields> => {
        let item: ShowFields = <ShowFields>ritem;
        return Promise.resolve(this.db.get("SELECT number , page_url , image_url FROM episodes WHERE show=? ORDER BY number DESC LIMIT 1"
            , item.identifier)).then((row) => {
                if (row == undefined) {
                    item.number = 0;
                } else {
                    item.number = row.number;
                    item.base_url = row.page_url;
                    item.last_episode_url = row.image_url;
                }
                return item;
            });
    }

    private static get_storage_location = (): Promise<string> => {
        return Promise.resolve(Database.location);
    }

    private perfrom_setup = (rshow: ShowFields): Promise<Show> => {
        let show: Show = new Show(rshow, this.config.showConfig[rshow.type]);
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
        return Promise.resolve(this.db.all("SELECT data FROM shows"))
            .map((show: { data: string }) => Promise.resolve(JSON.parse(show.data)));
    }

    public get_pure_show = (identifier: string): Promise<RawShow> => {
        return Promise.resolve(this.db.get("SELECT data FROM shows WHERE identifier=?", identifier))
            .then((show: { data: string }) => {
                if (show) return Promise.resolve(JSON.parse(show.data));
                else return show;
            });
    }

    public get_show_data = (identifier: string): Promise<ShowData> => {
        let data: ShowData = <ShowData>{};
        data.identifier = identifier;
        return Promise.resolve(this.db.all("SELECT number , type FROM last_read WHERE show=?", identifier))
            .map((row: { type: string, number: number }) => {
                data[row.type] = row.number;
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
            .then((full_path) => sqlite.open(full_path, <any>{ Promise }))
            .then((sql) => Database.instance.db = sql)
            .then(Database.instance.create_tables)
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
        var identifier = data.identifier;
        var aditional_data = JSON.stringify(data);
        return Promise.resolve("").then(() => this.db.run("INSERT INTO shows VALUES(?,?)", identifier, aditional_data))
            .then(() => this.db.run("INSERT INTO last_read VALUES(?,?,?)", identifier, "reread", 1))
            .then(() => this.db.run("INSERT INTO last_read VALUES(?,?,?)", identifier, "new", 1))
            .return(data);
    }


    public start_show = (identifier: string): Promise<ShowFields> => {
        return Promise.resolve(identifier)
            .then(() => this.db.get("SELECT data FROM shows WHERE identifier=?", identifier))
            .then((r) => JSON.parse(r.data))
            .then(this.resolve_show)
            .then(this.perfrom_setup)
            .then(manager.add_watcher);

    }

    public add_new_show = (show: RawShow): Promise<Show> => {
        return this.get_pure_show(show.identifier)
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

    public getConfigurations() : Configuration.Configurations {
        return this.config.showConfig;
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
    requireJS?: boolean;
    navigator_configuration?: string;
    private configuration: Configuration.Configuration;

    constructor(base_show: ShowFields, configuration: Configuration.Configuration) {
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
        this.configuration = configuration;
        this.navigator_configuration = base_show.navigator_configuration;
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
        let data: ShowData = <ShowData>{};
        data.identifier = this.identifier;
        return Database.getInstance().then(db => db.db.all("SELECT number , type FROM last_read WHERE show=?", this.identifier))
            .map((row: { type: string, number: number }) => {
                data[row.type] = row.number;
            })
            .then(() => {
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
            return Database.getInstance().then(db => db.db.run("UPDATE last_read SET number=$number WHERE show=$show AND type=$type",
                {
                    $number: Math.min(this.number, number),
                    $show: this.identifier,
                    $type: type
                }));
        else
            return Promise.all([Database.getInstance(), this.get_show_data()])
                .then(([db, data]) => db.db.run("UPDATE last_read SET number=$number WHERE show=$show AND type=$type",
                    {
                        $number: Math.min(Math.max(number, data[type]), this.number),
                        $show: this.identifier,
                        $type: type
                    }));
    }

    public delete_show = (): Promise<void> => {
        return Database.getInstance().then(db => db.deregister_show(this.identifier))
            .then(db => manager.stop_watcher(this.identifier)
                .then(() => db.db.run("DELETE FROM shows WHERE identifier=?", this.identifier))
                .then(() => db.db.run("DELETE FROM episodes WHERE show=?", this.identifier))
                .then(() => db.db.run("DELETE FROM last_read WHERE show=?", this.identifier))
                .then(() => shelljs.rm("-rf", this.directory))
                .catch(console.error)
            );
    }

    public restart_from = (episode: number, new_url: string, next_xpath: string,
        image_xpath: string, text_xpath: string): Promise<string> => {
        return this.get_show_data()
            .then(data => {
                return Database.getInstance().then(db =>
                    Promise.resolve()
                        .then(() => db.deregister_show(this.identifier))
                        .then(() => manager.stop_watcher(this))
                        .then()
                        .then(() => db.db.run("DELETE FROM episodes WHERE show=? AND number > ?", this.identifier, episode))
                        .then(() => db.db.run("UPDATE last_read SET number=? WHERE show=? AND type=?",
                            Math.min(Math.min(episode, data["new"]), this.number), this.identifier, "new"))
                        .then(() => db.db.run("UPDATE last_read SET number=? WHERE show=? AND type=?",
                            Math.min(Math.min(episode, data["reread"]), this.number), this.identifier, "reread"))
                        .then(() => {
                            if (new_url) {
                                return Promise.resolve()
                                    .then(() => db.db.run("UPDATE episodes SET page_url=? WHERE show=? AND number=?",
                                        new_url, this.identifier, episode));
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
                                            return db.db.run("UPDATE shows SET data=? WHERE identifier=?",
                                                JSON.stringify(pure_data),
                                                this.identifier)
                                        }).return(this.identifier));
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
        var identifier = data.identifier;
        var number = data.number;
        var image_url = data.url;
        var page_url = data.base_url;
        var aditional_data = {};
        if ('data' in data) aditional_data = data.data;
        aditional_data = JSON.stringify(aditional_data);
        return Database.getInstance()
            .then(db => db.db.run("INSERT INTO episodes VALUES(?,?,?,?,?)", identifier, number, image_url, page_url, aditional_data))
            .then(() => {
                if (this.number < data.number) {
                    this.number = data.number;
                    this.last_episode_url = data.url;
                    this.base_url = data.base_url;
                }
            })
            .return(data);
    }

    private episodePostParse(resp): Promise<Episode> {
        return new Promise((r, e) => {
            if (!resp || !resp.show) {
                e(new Error("Query failed - Could not find episode"));
                return;
            }
            let result: Episode = {
                identifier: resp.show,
                number: resp.number,
                url: resp.image_url,
                base_url: resp.page_url,
                thumbnail_name: "shows/" + resp.show + "/thumbnails/" + resp.number + ".jpg",
                filename: "shows/" + resp.show + "/" + resp.number + ".jpg",
                data: JSON.parse(resp.aditional_data)
            }
            r(result);
        });

    }

    public get_episode_data = (episode_number: number): Promise<Episode> => {
        return Database.getInstance().then(db => db.db.get("SELECT * FROM episodes WHERE show=? AND number=? LIMIT 1", this.identifier, episode_number))
            .then((resp) => this.episodePostParse(resp))
    }

    public get_episode_page_url = (episode_number: number): Promise<string> => {
        return this.get_episode_data(episode_number)
            .then((episode) => episode.base_url);
    }
    public get_first = (): Promise<Episode> => {
        return Database.getInstance().then(db => db.db.get("SELECT *, MIN(number) FROM episodes WHERE show=?", this.identifier))
            .then((resp) => this.episodePostParse(resp));
    }

    public get_last = (): Promise<Episode> => {
        return Database.getInstance().then(db => db.db.get("SELECT *, MAX(number) FROM episodes WHERE show=?", this.identifier))
            .then((resp) => this.episodePostParse(resp));

    }

    public get_next = (episode_number: number): Promise<Episode> => {
        return Database.getInstance().then(db => db.db.get("SELECT *, MIN(number) FROM episodes WHERE show=? AND number > ?", this.identifier, episode_number))
            .then((resp) => this.episodePostParse(resp)).catch((e) => this.get_episode_data(episode_number)).catch(() => undefined);
    }


    public get_prev = (episode_number: number): Promise<Episode> => {
        return Database.getInstance().then(db => db.db.get("SELECT *, MAX(number) FROM episodes WHERE show=? AND number < ?", this.identifier, episode_number))
            .then((resp) => this.episodePostParse(resp)).catch((e) => this.get_episode_data(episode_number)).catch(() => undefined);
    }

    public get_last_unread = (type: string): Promise<Episode> => {
        return this.get_show_data()
            .then((show_data) => show_data[type])
            .then((episode: number) => this.get_next(episode));
    }

    public deleteEpiosde(index: number): Promise<any> {
        return this.get_episode_data(index).then((episode) => [
            Database.getInstance().then(db => db.db.get("DELETE FROM episodes WHERE show=? AND number=?", this.identifier, index)),
            Promise.all([Database.resolve_path(episode.filename), Database.resolve_path(episode.thumbnail_name)]).map((file: string) => shelljs.rm(file))
        ]).all();
    }

    public getConfiguration = (): Configuration.Configuration => {
        return this.configuration;
    }

    public check_image_exists = (image_url: string): Promise<boolean> => {
        return Database.getInstance().then(db => db.db.get("SELECT image_url FROM episodes WHERE show=$show AND image_url=$image_url LIMIT 1", {
            $show: this.identifier,
            $image_url: image_url
        })).then((s) => !!s);
    }

}

const manager = require('./../downloaders/manager');
