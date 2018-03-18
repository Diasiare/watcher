import * as Promise from 'bluebird' ;
import * as express from 'express' ;
import * as path from 'path' ;
import * as bodyParser from 'body-parser' ;
import * as multer from 'multer' ;
import * as request from 'request' ;
import * as tmpExpressWs from 'express-ws'

const upload = multer();
import {ShowFields} from '../types/Show';
import {ShowData} from '../types/ShowData';
import {Express} from 'express-serve-static-core';


var expressWs = tmpExpressWs;

var app: Express = null;
const PORT: number = 8080;

function heartbeat(): void {
    this.isAlive = true;
}


const ensure_started = function (): Promise<any> {
    return new Promise((r) => {
        if (!app) {
            app = express();
            expressWs = expressWs(app);
            expressWs.getWss().on("error", (err, req, res) => {
                console.log(err);
                res.end();
            });
            expressWs.getWss().on('connection', function connection(ws) {
                ws.isAlive = true;
                ws.on('pong', heartbeat);
            });
            setInterval(function ping() {
                expressWs.getWss().clients.forEach(function each(ws) {
                    if (ws.isAlive === false) return ws.terminate();

                    ws.isAlive = false;
                    ws.ping('', false, true);
                });
            }, 30000);


            app.get('/', function (req, res) {
                res.redirect('/list');
            });
            app.listen(PORT);
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({
                extended: true
            }));
            console.log('Running on http://localhost:' + PORT);
        }
        r(app);
    });
}

const serve_shows = function (shows: ShowFields[]): Promise<any> {
    return Promise.all([ensure_started(), Database.resolve_path("shows")])
        .then(([app, dir]) => app.use("/shows", express.static(dir)));
}

const serve_static_resources = function (): Promise<any> {
    return ensure_started()
        .then((app) => app.use(express.static("resources")));
}


const setup_data_calls = function (): Promise<any> {
    return ensure_started()
        .then((app) => {
            /* Gets the episode that is in direction of the given episode
             *
             */
            app.get('/data/shows/:show/:episode/:direction', (req, res) => {
                res.set({
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                })
                let respond = (data) => {
                    if (data) {
                        data.src = build_resource_url(data.identifier, data.number + ".jpg");
                        res.json(data);
                    } else {
                        res.json({data: {}});
                    }

                }
                let episode = parseInt(req.params.episode);
                if (req.params.direction === "last") Database.getInstance().then(db => db.get_show(req.params.show)).then(s => s.get_last()).then(respond);
                else if (req.params.direction === "first") Database.getInstance().then(db => db.get_show(req.params.show)).then(s => s.get_first()).then(respond);
                else if (req.params.direction === "next") Database.getInstance().then(db => db.get_show(req.params.show)).then(s => s.get_next(episode))
                    .then(respond);
                else if (req.params.direction === "prev") Database.getInstance().then(db => db.get_show(req.params.show)).then(s => s.get_prev(episode))
                    .then(respond);
                else if (req.params.direction === "current") Database.getInstance().then(db => db.get_show(req.params.show)).then(s => s.get_episode_data(episode))
                    .catch(() => undefined)
                    .then(respond);
            });
            return app;
        }).then((app) => {
            /* Gets the metadata for all shows 
             *
             */
            app.get('/data/shows/', (req, res) => {
                res.set({
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                })
                get_shows_data()
                    .then((data) => {
                        res.json(data);
                    }).done();
            });
            return app;
        }).then((app) => {
            /* Gets the basic data for show
             *
             */
            app.get('/data/shows/:show', (req, res) => {
                res.set({
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                })
                Database.getInstance().then(db => db.get_show(req.params.show))
                    .then((show) => show.get_show_data())
                    .then((data) => {
                        if (data.logo) {
                            data.logo = build_resource_url(data.identifier, "logo.jpg");
                        }
                        res.json(data);
                    });
            });
            return app;
        }).then((app) => {
            /* Send a backup.json file that can be used to restore all shows
             * from their metadata
             */
            app.get('/data/backup.json', (req, res) => {
                res.set({
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Content-Disposition": 'attachment; filename="backup.json"',
                    "Content-Type": "text/html"
                })
                Database.getInstance()
                    .then(db => db.get_pure_shows())
                    .then((data) => {
                        res.send(JSON.stringify(data));
                    }).done();
            });
            return app;
        }).then((app) => {
            /* Recreates the server from a backup
             * 
             * re adds every show in the JSON file sent by the user
             */
            app.post('/data/backup.json', upload.single("backup"), (req, res) => {
                Promise.resolve(JSON.parse(req.file.buffer))
                    .map((show: RawShow) => Database.getInstance().then(db => db.add_new_show(show)))
                    .then(() => res.json({
                        failed: false
                    }))
                    .then(perform_callbacks)
                    .catch((e) => {
                        res.json({
                            failed: true,
                            error: e
                        });
                        console.error(e);
                    });
            });
            return app;
        }).then((app) => {
            app.post('/data/shows/:show/:episode/:type', (req, res) => {
                Database.getInstance().then(db => db.get_show(req.params.show))
                    .then(show => show.update_last_read(req.params.episode, req.params.type))
                    .then(() => perform_callbacks(req.params.show))
                    .done();
                res.end();
            });
            return app;
        }).then((app) => {
            /* Redownload episode of show
             *
             * this will refetch the page of the episode and update the downloaded
             * image if there is one, along with the metadata of the episode such as title,
             * hover text and text
             */
            app.post('/data/shows/:show/:episode', (req, res) => {
                downloader.redownload(req.params.show, parseInt(req.params.episode))
                    .then(() => res.json({
                        failed: false
                    }))
                    .catch((e) => {
                        res.json({
                            failed: true,
                            error: e
                        });
                        console.error(e);
                    });
            });
            return app;
        }).then((app) => {
            /* Restart a show from a specific point, potentially with new configuartion for the show
             *
             * Body componenets:
             *   episode: the episode to restart from (String parsable to int)
             *   new_url: the new page url of episode
             *   nextpath: the new next_xpath that the show should use from now
             *   imxpath: the new image xpath the show should use from now
             *   textxpath: the new text xpath that the show should use from now 
             */
            app.post('/data/shows/:show', (req, res) => {
                let data = req.body;
                Promise.resolve(data)
                    .then(() => Database.getInstance().then(db => db.get_show(req.params.show))
                        .then(show => show.restart_from(parseInt(data.episode), data.new_url,
                            data.nextxpath, data.imxpath, data.textxpath)))
                    .then(() => res.json({
                        identifier: data.identifier,
                        failed: false
                    }))
                    .then(() => perform_callbacks(req.params.show))
                    .catch((e) => {
                        res.json({
                            failed: true,
                            error: e
                        });
                        console.error(e);
                    });
            });
            return app;
        }).then((app) => {
            /*
             * Create new show
             */
            //TODO: Validate the data here
            app.post('/data/shows', (req, res) => {
                let data = req.body;
                Promise.resolve(data)
                    .then((data) => Database.getInstance().then(db => db.add_new_show(data)))
                    .then(() => res.json({
                        identifier: data.identifier,
                        failed: false
                    }))
                    .then(() => perform_callbacks(data.identifier))
                    .catch((e) => {
                        res.json({
                            failed: true,
                            error: e
                        });
                        console.error(e);
                    });
            });
            return app;
        }).then((app) => {
            /*
             * Get the page located at req.query.url
             *
             * Used to bypas anti XSS limitations in browsers, very dangerous, 
             * but nessesary for creating the interactive XPATH elements
             */
            app.get('/function/get', (req, res) => {
                request({
                    url: req.query.url,
                    encoding: "utf-8",
                    method: 'GET',
                    headers: {
                        'User-Agent': "request",
                    },
                    gzip: true
                }, function (error, response, body) {
                    if (error) {
                        res.send("");
                        return;
                    }
                    res.send(body);
                })
            });
            return app;
        }).then((app) => {
            /*
             * Delete a show
             */
            app.delete('/data/shows/:show', (req, res) => {
                Database.getInstance().then(db => db.get_show(req.params.show))
                    .then(show => show.delete_show())
                    .then(() => res.json({failed: false}))
                    .catch((e) => {
                        console.error(e);
                        res.json({failed: true, error: e});
                    })
                    .then(() => perform_callbacks(req.params.show));
            })
            return app;
        }).then((app) => {
            /*
             * Websocket implementation, regardless of message we send back
             * all shows, sending specific shows is only done as a result of
             * backend updates
             */
            app.ws('/socket/shows', (ws, req) => {

                get_shows_data()
                    .then((data) => {
                        try {
                            ws.send(JSON.stringify({
                                data: data,
                                type: "all"
                            }));
                        } catch (e) {
                            console.error(e);
                        }
                    })
                ws.on("message", () => {
                    get_shows_data()
                        .then((data) => {
                            try {
                                ws.send(JSON.stringify({
                                    data: data,
                                    type: "all"
                                }));
                            } catch (e) {
                                console.error(e);
                            }
                        })
                })
                ws.on("error", (e) => {
                    console.error(e);
                })
            });
            return app;
        });
}

const perform_callbacks = function (identifier: string): Promise<string> | string {
    if (app) {
        return Database.getInstance().then(db => db.get_show(identifier))
            .then(show => show.get_show_data()
                .then((data) => {
                    if (!show || !data.type) return null;
                    if (data) {
                        data.name = show.name;
                        data.episode_count = show.number;
                    }
                    if (data && data.logo) {
                        data.logo = build_resource_url(data.identifier, "logo.jpg");
                    }
                    return data;
                })
                .then((data) => {
                    for (let ws of expressWs.getWss().clients) {
                        try {
                            ws.send(JSON.stringify({
                                data: data,
                                type: "single",
                                id: identifier
                            }));
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    return identifier;
                }));
    }
    return identifier;
}

const get_shows_data = function (): Promise<ShowData[]> {
    return Database.getInstance().then(db => db.get_shows())
        .map((show: Show) => {
            return show.get_show_data().then((data) => {
                if (data.logo) {
                    data.logo = build_resource_url(data.identifier, "logo.jpg");
                }
                return data;
            })
        })
}

const setup_default = function (): void {
    app.use("/", function (req, res, next) {
        res.sendFile(path.join(__dirname, "../../resources/index.html"));
    })
    app.use("/read*", function (req, res, next) {
        res.sendFile(path.join(__dirname, "../../resources/index.html"));
    })
    app.use("/list*", function (req, res, next) {
        res.sendFile(path.join(__dirname, "../../resources/index.html"));
    })
    app.use("/new*", function (req, res, next) {
        res.sendFile(path.join(__dirname, "../../resources/index.html"));
    })
    app.use(function (err, req, res, next) {
        console.error(err.stack)
        res.status(500).send('Something broke!')
    })
}

const start_all = function (shows: ShowFields[]): Promise<void> {
    return serve_shows(shows)
        .then(serve_static_resources)
        .then(setup_data_calls)
        .then(setup_default);
}

const build_resource_url = function (...parts: string[]): string {
    let adress = ""
    if (parts.length >= 1) adress = adress + "/shows/" + parts[0];
    if (parts.length >= 2) adress = adress + "/" + parts[1];
    return adress;

}

export {
    serve_shows,
    serve_static_resources,
    start_all,
    perform_callbacks
}


import {Database, Show} from '../data/config' ;
import * as downloader from '../downloaders/image_sequence';
import {RawShow} from "../types/RawShow";