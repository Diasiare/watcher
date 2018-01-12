import * as Promise from 'bluebird' ;
import * as sqlite from 'sqlite' ;
import {RawShow} from '../types/RawShow';
import {Show} from '../types/Show';
import {ShowData} from '../types/ShowData';
//const db = require('sqlite');
const fs = require('fs');
const path = require('path');
const mkdir = Promise.promisify(fs.mkdir);
const shelljs = require('shelljs');

interface Config {
    shows : Map<string, Show>
}

const config : Config = {shows:new Map()};
const location : string = process.env.WATCHER_LOCATION;

const model = {
    shows:`identifier TEXT NOT NULL PRIMARY KEY,
    data TEXT
    `,
    episodes:`show TEXT NOT NULL REFERENCES shows(identifier) ON DELETE CASCADE,
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

var loaded = false;

const defaults = {
    interval : 30*60*1000 //30 Minutes
}
var db : sqlite.Database = null;



const init = function (path) : Promise<Config> {
    return resolve_path(path)
    .then((full_path)=>sqlite.open(full_path, <any> {Promise}))
    .then((sql)=>db=sql)
    .then(create_tables)
    .then(ensure_loaded);
}

const create_tables = function() : Promise<any> {
    return Promise.each(Object.keys(model),  (t_name)=>{
            return db.exec("CREATE TABLE IF NOT EXISTS " + t_name + " ( " + model[t_name] + " )");
        }
    );
}

const close = function () : Promise<void> {
    console.log("DATABASE CLOSED")
    return <any> db.close();
}

const ensure_loaded = function () : Promise<Config> {
    return new Promise((r)=>{
        if (!loaded) load_shows().then((shows)=>{
            loaded=true;
            r(get_storage_location()
                .then((dir)=>shelljs.mkdir('-p',dir))
                .then(()=>Promise.map(shows, perfrom_setup)
                .return(config)));
        }); 
        else r(config);
    });
}

//Function to run on restart to fix possible problems that might crop up with the data
const ensure_consistency = function (show : Show) : Promise<Show> {
    return get_show_data(show.identifier)
        .then((data)=>{
            return ["new","reread"].map((type)=>{
                if (data[type] > show.number) {
                    return update_last_read(show.identifier,show.number,type)
                } else {
                    return null;
                }
            })
        })
        .all()
        .return(show);
}

const load_shows = function() : Promise<Show[]> {
    return get_pure_shows().map(resolve_show);
}

//Load default values and ensure that directories exist
const perfrom_setup = function (rshow : Show) : Promise<Show> {
    let show : Show = <Show> rshow;
    return Promise.map(Object.keys(defaults),  (name)=>{
        if (!(name in show)) show[name]=defaults[name];
    })
    .then(()=>resolve_path(path.join("shows",show.identifier)))
    .then((d)=>{show.directory=d;return d})
    .then((dir)=>shelljs.mkdir('-p',dir))
    .catch(console.error)
    .then(()=>resolve_path(path.join("shows",show.identifier,"thumbnails")))
    .then((d)=>{show.thumbnail_dir=d;return d})
    .then((dir)=>shelljs.mkdir('-p',dir))
    .catch(console.error)
    .then(()=>{
        if (show.logo && !fs.existsSync(path.join(show.directory,"logo.jpg"))) {
            return imdown.download_image({url:show.logo,
                filename:path.join(show.directory,"logo.jpg")})
            .catch((e)=>{
                delete show.logo;
            })
            .return(show);
        }
        return show
    })
    .then(()=>{
        config.shows.set(show.identifier,show);
        return show;
    })
    .then(ensure_consistency)
    .return(show);
}


const get_shows = function () : Promise<Show[]> {
    return Promise.resolve(Array.from(config.shows.values()));
}

const get_pure_shows = function() : Promise<RawShow[]> {
    return (<any> db.all("SELECT data FROM shows"))
        .map((show)=>Promise.resolve(JSON.parse(show.data)));
}

const get_pure_show = function(identifier: string) : Promise<RawShow> {
    return <any> db.get("SELECT data FROM shows WHERE identifier=?", identifier)
        .then((show)=>{
            if (show) return Promise.resolve(JSON.parse(show.data));
            else return show;
        });
}

const get_show = function (identifier: string) : Promise<Show> {
    let show = config.shows.get(identifier)
    if (show) {
        return Promise.resolve(show);
    } else {
        return Promise.reject(new Error("Show does not exist"));
    }
    
}

const resolve_show = function (ritem: RawShow) : Show {
    let item : Show = <Show> ritem; 
    return <any> db.get("SELECT number , page_url , image_url FROM episodes WHERE show=? ORDER BY number DESC LIMIT 1"
        ,item.identifier).then((row)=>{
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

//We store the data as a json object because that is much easier as the format needs to be
//wastly different for differnt types of shows (image_sequence, torrent, tv, etc), the overhead should be minimal
//As this table should only rarely be written to
const insert_new_show = function (data: RawShow) : Promise<RawShow> {
    var identifier = data.identifier;
    var aditional_data = JSON.stringify(data);
    return Promise.resolve("").then(()=>db.run("INSERT INTO shows VALUES(?,?)", identifier, aditional_data))
    .then(()=>db.run("INSERT INTO last_read VALUES(?,?,?)",identifier,"reread",1))
    .then(()=>db.run("INSERT INTO last_read VALUES(?,?,?)",identifier,"new",1))
    .return(data);
}

const add_new_show = function(show : RawShow) : Promise<Show> {
    return get_pure_show(show.identifier)
    .then((os)=>{
        //Don't update if no chnages have been made
        if (os && Object.keys(show).every((k)=>os[k]==show[k])
             && Object.keys(os).every((k)=>os[k]==show[k])) {
            return get_show(show.identifier);
        } else {
            return  delete_show(show.identifier)
                .then(()=>insert_new_show(show))
                .then(()=>start_show(show.identifier))
                .then(()=>app.perform_callbacks(show.identifier))
                .then(()=>get_show(show.identifier));
        }
    })
}

const start_show = function(identifier: string) : Promise<Show> {
    return Promise.resolve(identifier)
        .then(()=>db.get("SELECT data FROM shows WHERE identifier=?", identifier))
        .then((r)=>JSON.parse(r.data))
        .then(resolve_show)
        .then(perfrom_setup)
        .then(manager.add_watcher);

}

const insert_new_episode = function (data) {
    var identifier = data.identifier;
    var number = data.number;
    var image_url = data.url;
    var page_url = data.base_url;
    var aditional_data = {};
    if ('data' in data) aditional_data = data.data;
    aditional_data = JSON.stringify(aditional_data);
    return (<any>db.run("INSERT INTO episodes VALUES(?,?,?,?,?)", identifier, number, image_url , page_url
        , aditional_data))
    .then(()=>get_show(data.identifier))
    .then((show)=>{
        if (show.number < data.number) {
            show.number = data.number;
            show.last_episode_url = data.image_url;
            show.base_url = data.base_url;
        }
    })
    .then(()=>app.perform_callbacks(data.identifier))
    .return(data);
}

const get_storage_location = function () {
    return Promise.resolve(location);
}

const resolve_path = function (filename) {
    return get_storage_location()
    .then((location)=>path.resolve(location,filename));
}

const update_last_read = function(identifier,number,type) {
    if (type != "new" )
        return get_show(identifier)
        .then((show)=>{
            return db.run("UPDATE last_read SET number=$number WHERE show=$show AND type=$type",
                {$number:Math.min(show.number,number),
                    $show:identifier,
                    $type:type})            
        });
    else 
        return Promise.all([get_show_data(identifier), get_show(identifier)])
        .then(([data,show])=>db.run("UPDATE last_read SET number=$number WHERE show=$show AND type=$type",
            {$number:Math.min(Math.max(number,data[type]),show.number),
                $show:identifier,
                $type:type}));
}



const get_episode_data = function (show,episode) {
    return db.get("SELECT * FROM episodes WHERE show=? AND number=? LIMIT 1", show , episode)
        .then((resp)=>{return new Promise((r,e) => {
                if (!resp) {
                    e(e);
                    return;
                }
                r({number:resp.number,
                    identifier:resp.show,
                    original_url:resp.page_url,
                    data:JSON.parse(resp.aditional_data)});
            });
        });
}

const get_episode_page_url = function (show,episode) {
    return db.get("SELECT * FROM episodes WHERE show=? AND number=? LIMIT 1", show , episode)
        .then((resp)=>{return new Promise((r,e) => {
                if (!resp) {
                    e(e);
                    return;
                }
                r(resp.page_url);
            });
        });
}
const get_first = function (identifier) {
    return get_episode_data(identifier,1);
}

const get_last = function (identifier) {
    return get_show(identifier).then((show)=>get_episode_data(identifier,show.number));
}

const get_next = function (identifier,episode) {
    return get_episode_data(identifier,episode+1).catch((e)=>get_episode_data(identifier,episode)).catch(()=>undefined);
}


const get_prev = function (identifier,episode) {
    return get_episode_data(identifier,episode-1).catch(()=>get_episode_data(identifier,episode)).catch(()=>undefined);
}

const get_last_unread = function(identifier,type) {
    return db.get("SELECT show , number FROM last_read WHERE type=? AND show=?",
        type,identifier).then((data)=>get_next(data.show,data.number));
}

const delete_show = function(identifier) {
    return get_show(identifier)
            .then((show)=>{
                config.shows.delete(identifier);
                return show;
            })
            .then(manager.stop_watcher)
            .then(()=>db.run("DELETE FROM shows WHERE identifier=?",identifier))
            .then(()=>db.run("DELETE FROM episodes WHERE show=?",identifier))
            .then(()=>db.run("DELETE FROM last_read WHERE show=?",identifier))
            .then(()=>get_show(identifier))
            .then((show)=>shelljs.rm("-rf",show.directory))
            .catch(console.error)
            .return(identifier);
}

const restart_from = function(identifier, episode, new_url, next_xpath, image_xpath, text_xpath) {
    return Promise.all([get_show(identifier),get_show_data(identifier)])
    .then(([show,data])=>{
        if (!show) {
            return identifier;
        }
        return Promise.resolve(show)
            .then((show)=>{
                config.shows.delete(identifier);
                return show;
            })
            .then(manager.stop_watcher)
            .then(()=>db.run("DELETE FROM episodes WHERE show=? AND number > ?",identifier,episode))
            .then(()=>db.run("UPDATE last_read SET number=? WHERE show=? AND type=?",
                Math.min(Math.min(episode,data["new"]),show.number) ,identifier, "new"))
            .then(()=>db.run("UPDATE last_read SET number=? WHERE show=? AND type=?",
                Math.min(Math.min(episode,data["reread"]),show.number) ,identifier, "reread"))
            .then(()=>{
                if (new_url) {
                    return Promise.resolve(show)
                        .then(()=>db.run("UPDATE episodes SET page_url=? WHERE show=? AND number=?",
                            new_url, identifier, episode));
                }
            })
            .then(()=>{
                if (next_xpath || image_xpath || text_xpath) {
                    return get_pure_show(identifier)
                        .then((pure_data)=>{
                            if (next_xpath) pure_data.next_xpath = next_xpath;
                            if (image_xpath) pure_data.image_xpath = image_xpath;
                            if (text_xpath) pure_data.text_xpath = text_xpath;
                            return db.run("UPDATE shows SET data=? WHERE identifier=?" , 
                                JSON.stringify(pure_data),
                                identifier)
                        }).return(show)
                } else {
                    return show
                }
            })
            .catch(console.error)
            .then(()=>start_show(identifier))
            .return(identifier);
    })
}

const get_show_data = function(identifier : string) : Promise<ShowData>
{
    let data : ShowData = <ShowData> {};
    data.identifier = identifier;
    return (<any>db.all("SELECT number , type FROM last_read WHERE show=?",identifier))
    .map((row)=>{
        data[row.type]=row.number;
    })
    .then(()=>get_show(identifier))
    .then((show : Show)=>{
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

const check_image_exists = function (show,image_url) {
    return db.get("SELECT number FROM episodes WHERE show=$show AND image_url=$image_url LIMIT 1", {
        $show:show,
        $image_url:image_url
    }).then((s)=>!!s);
}

export {
    get_shows,
    resolve_path,
    add_new_show,
    delete_show,
    init,
    close,
    insert_new_episode,
    update_last_read,
    get_next,
    get_prev,
    get_last,
    get_first,
    get_episode_data,
    get_show_data,
    get_pure_shows,
    get_pure_show,
    get_show,
    check_image_exists,
    get_episode_page_url,
    restart_from,
};
const manager = require('./../downloaders/manager');
const imdown = require('./../downloaders/image_sequence');
const app = require('./../webapp/app');