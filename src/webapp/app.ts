import * as Promise from 'bluebird' ;
import * as express from 'express' ;
import * as path from 'path' ;
import * as bodyParser from 'body-parser' ;

import ShowFields from '../types/Show';
import {Database} from '../data/Database' ;
import ILink from '../link/Link';

var Link : ILink = null;

var app = null;
const PORT: number = 8080;

const ensure_started = function (): Promise<express.Express> {
    return new Promise((r) => {
        if (!app) {
            app = express();
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


const setup_data_calls = function (): Promise<express.Express> {
    return ensure_started()
        .then((app) => {
            /* Gets the episode that is in direction of the given episode
             *
             */
            app.get('/data/shows/:show/:episode/:direction', (req, res) => {
                Link.getRelativeEpisode(req.params.show, parseInt(req.params.episode), req.params.direction).then((data) => res.json(data)).catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
                    });;
            });
            return app;
        }).then((app) => {
            /* Gets the metadata for all shows 
             *
             */
            app.get('/data/shows/', (req, res) => {
                Link.getShowsData().then((data) => res.json(data)).catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
                    });
            });
            return app;
        }).then((app) => {
            /* Gets the basic data for show
             *
             */
            app.get('/data/shows/:show', (req, res) => {
                Link.getShowData(req.params.show).then((data) => res.json(data)).catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
                    });
            });
            return app;
        }).then((app) => {
            /* Send a backup.json file that can be used to restore all shows
             * from their metadata
             */
            app.get('/data/backup.json', (req, res) => {
                res.set({
                    "Content-Disposition": 'attachment; filename="backup.json"',
                    "Content-Type": "text/html"
                })
                Link.getBackup()
                    .then((data) => {
                        res.send(JSON.stringify(data));
                    }).catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
                    });
            });
            return app;
        }).then((app) => {
            /* Recreates the server from a backup
             * 
             * re adds every show in the JSON file sent by the user
             */
            app.post('/data/backup.json', (req, res) => {
                let data = req.body.backup;
                console.log(data)
                Link.loadBackup(data)
                    .then(() => res.end())
                    .catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
                    });
            });
            return app;
        }).then((app) => {
            app.post('/data/shows/:show/:episode/:type', (req, res) => {
                Link.updateLastRead(req.params.show, parseInt(req.params.episode), req.params.type)
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
                Link.redownload(req.params.show, parseInt(req.params.episode))
                    .then(() => res.end())
                    .catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
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
                Link.restartShow(req.params.show, parseInt(data.episode), data.new_url,
                            data.nextxpath, data.imxpath, data.textxpath)
                    .then(() => res.end())
                    .catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
                    });
            });
            return app;
        }).then((app) => {
            /*
             * Create new show
             */
            //TODO: Validate the data here
            app.post('/data/shows', (req, res) => {
                let data : RawShow = req.body;
                Link.newShow(data)
                    .then((data) => res.json(data))
                    .catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
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
                Link.getWebPage(req.query.url)
                .then((body) => res.send(body))
                .catch(() => res.send(""));
            });
            return app;
        }).then((app) => {
            /*
             * Delete a show
             */
            app.delete('/data/shows/:show', (req, res) => {
                Link.deleteShow(req.params.show)
                    .then(() => res.end())
                    .catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
                    });
            })
            return app;
        }).then((app) => {
            /*
             * Delete an episode
             */
            app.delete('/data/shows/:show/:episode', (req, res) => {
                Link.deleteEpisode(req.params.show, parseInt(req.params.episode))
                    .then(() => res.end())
                    .catch((e) => {
                        console.error(e);
                        res.status(500).send(e.message);
                    });
            })
            return app;
        });;
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

const start_all = function (shows: ShowFields[], link : ILink): Promise<void> {
    Link = link;
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
}

import RawShow from "../types/RawShow";

