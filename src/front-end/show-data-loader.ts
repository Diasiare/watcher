import * as $ from 'jquery';
const nav = require("./navigate").navigate;
var listeners = new Map();
var show_listeners = new Map();
var socket = null;
var data = null;
const notifications = {};
var last_notification_id = null;

function preload_data() {
    if (!socket) {
        let loc = window.location, new_uri;
        if (loc.protocol === "https:") {
            new_uri = "wss:";
        } else {
            new_uri = "ws:";
        }
        new_uri += "//" + loc.host;
        new_uri += "/socket/shows";

        try {
            socket = new WebSocket(new_uri);
            socket.addEventListener("message", (event) => {
                let d = JSON.parse(event.data);
                if (d.type == "all") {
                    let tmp = {};
                    d.data.forEach((show) => tmp[show.identifier] = show);
                    data = tmp;
                    run_callbacks();
                } else if (d.type == "single") {
                    if (!data) {
                        data = {};
                    }
                    if (d.data) {
                        //Do not push noteifications for the same show twice in a row
                        if ((!data[d.identifier]
                                || data[d.identifier].episode_count < d.data.episode_count)
                            && d.data.episode_count > 0
                            && d.data.new < d.data.episode_count
                            && last_notification_id !== d.identifier
                            && (<any>Notification).permission === "granted") {
                            if (notifications[d.identifier]) {
                                notifications[d.identifier].close();
                            }
                            let n = new Notification("Watcher: " + d.data.name, <any>{
                                data: d,
                                icon: window.location.protocol + "//"
                                + window.location.host + "/shows/"
                                + d.data.identifier + "/thumbnails/"
                                + d.data.episode_count + ".jpg",
                                body: "" + d.data.name + " episode " + d.data.episode_count + " is out!",
                            });
                            n.onclick = (e) => {
                                nav("/read/" + d.data.identifier + "/" + (data[d.data.identifier].new) + "/new");
                            };
                            notifications[d.identifier] = n;
                            last_notification_id = d.identifier;
                        }
                        data[d.data.identifier] = d.data;
                    } else {
                        delete data[d.identifier];
                    }
                    run_callbacks()
                }

            })
            socket.addEventListener("close", (event) => {
                socket = null;
                preload_data();
            })
        } catch (e) {
            setTimeout(preload_data, 60 * 1000);//Wait for one minute if the server closes the conection
        }
    }
}

function run_callbacks() {
    for (let key of listeners.keys()) {
        run_callback(key);
    }
    for (let key of show_listeners.keys()) {
        for (let k2 of show_listeners.get(key).keys()) {
            run_show_callback(key, k2);
        }
    }
}

function run_callback(o) {
    let tmp = {};
    let {status, type} = listeners.get(o);
    let items = Object.keys(data).map((k) => data[k]);
    if (type) {
        if (type == "new") {
            items = items.filter((show) => {
                return show.new && show.episode_count && show.new < show.episode_count;
            });
        } else {
            items = items.filter((show) => {
                return show.type && show.type == type;
            });
        }
    }
    tmp[status] = items;
    o.setState(tmp);
}

function add_listener(o : React.Component, status : string, ...rest) {
    let tmp : any= {};
    tmp.status = status;
    if (rest.length > 0) tmp.type = rest[0];
    listeners.set(o, tmp);
    if (data) {
        run_callback(o);
    }
}

function remove_listener(o) {
    listeners.delete(o);
}

function register_show_listener(o : React.Component, status : string, show : string) {
    let m = null;
    if (show_listeners.has(show)) {
        m = show_listeners.get(show);
    } else {
        m = new Map();
        show_listeners.set(show, m);
    }
    m.set(o, status);
    if (data) {
        run_show_callback(show, o);
    }
}

function remove_show_listener(o, show) {
    let m = show_listeners.get(show);
    if (m) {
        m.delete(o);
    }
}


function run_show_callback(identifier, o) {
    let m = show_listeners.get(identifier);
    if (m) {
        let status = m.get(o);
        if (status && data) {
            let tmp = {};
            tmp[status] = data[identifier];
            o.setState(tmp);
        }
    }
}

function get_show_data(identifier) {
    return data[identifier];
}

module.exports = {
    preload_data: preload_data,
    register_listener: add_listener,
    remove_listener: remove_listener,
    register_show_listener: register_show_listener,
    remove_show_listener: remove_show_listener,
    get_show_data: get_show_data,
}




