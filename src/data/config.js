const fs = require('fs');
const db = require("sqlite");
const Promise = require('bluebird');
const path = require('path');
const mkdir = Promise.promisify(fs.mkdir);
const shelljs = require('shelljs');

const config = {shows:new Map()};
const location = process.env.WATCHER_LOCATION;


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
	interval : 15*60*1000 //15 Minutes
}

init = function (path) {
	return resolve_path(path)
	.then((full_path)=>db.open(full_path, {Promise}))
	.then(create_tables)
	.then(ensure_loaded);
}

create_tables = function() {
	return Promise.each(Object.keys(model),  (t_name)=>{
			return db.exec("CREATE TABLE IF NOT EXISTS " + t_name + " ( " + model[t_name] + " )");
		}
	);
}

close = function () {
	console.log("DATABASE CLOSED")
	return db.close();
}

ensure_loaded = function () {
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

load_shows = function() {
	return db.all("SELECT data FROM shows")
		.map((show)=>Promise.resolve(JSON.parse(show.data))
		.then(resolve_show));
}

//Load default values and ensure that directories exist
perfrom_setup = function (show) {
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
	.then(()=>{config.shows.set(show.identifier,show);
				return show;
	})
	.return(show);
}


get_shows = function () {
	return Promise.resolve(Array.from(config.shows.values()));
}

get_pure_shows = function() {
	return db.all("SELECT data FROM shows")
		.map((show)=>Promise.resolve(JSON.parse(show.data)));
}

get_pure_show = function(identifier) {
	return db.get("SELECT data FROM shows WHERE identifier=?", identifier)
		.then((show)=>{
			if (show) return Promise.resolve(JSON.parse(show.data));
			else return show;
		});
}

get_show = function (identifier) {
	return Promise.resolve(config.shows.get(identifier));
}

resolve_show = function (item) {
	return db.get("SELECT number , page_url , image_url FROM episodes WHERE show=? ORDER BY number DESC LIMIT 1"
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
insert_new_show = function (data) {
	var identifier = data.identifier;
	var aditional_data = JSON.stringify(data);
	return Promise.resolve("").then(()=>db.run("INSERT INTO shows VALUES(?,?)", identifier, aditional_data))
	.then(()=>db.run("INSERT INTO last_read VALUES(?,?,?)",identifier,"reread",1))
	.then(()=>db.run("INSERT INTO last_read VALUES(?,?,?)",identifier,"new",1))
	.return(data);
}

add_new_show = function(show) {
	return get_pure_show(show.identifier)
	.then((os)=>{
		//Don't update if no chnages have been made
		if (os && Object.keys(show).every((k)=>os[k]==show[k])
			 && Object.keys(os).every((k)=>os[k]==show[k])) {
			return os;
		} else {
			return 	delete_show(show.identifier)
				.then(()=>insert_new_show(show))
				.then(()=>db.get("SELECT data FROM shows WHERE identifier=?", show.identifier))
				.then((r)=>JSON.parse(r.data))
				.then(resolve_show)
				.then(perfrom_setup)
				.then(manager.add_watcher)
				.then(()=>app.perform_callbacks(show.identifier))
				.then(()=>get_show(show.identifier));
		}
	})
}

insert_new_episode = function (data) {
	var identifier = data.identifier;
	var number = data.number;
	var image_url = data.url;
	var page_url = data.base_url;
	var aditional_data = {};
	if ('data' in data) aditional_data = data.data;
	aditional_data = JSON.stringify(aditional_data);
	return db.run("INSERT INTO episodes VALUES(?,?,?,?,?)", identifier, number, image_url , page_url
		, aditional_data)
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

get_storage_location = function () {
	return Promise.resolve(location);
}

resolve_path = function (filename) {
	return get_storage_location()
	.then((location)=>path.resolve(location,filename));
}

update_last_read = function(show,number,type) {
	if (type != "new" )
		return db.run("UPDATE last_read SET number=$number WHERE show=$show AND type=$type",
			{$number:number,
				$show:show,
				$type:type});
	else 
		return get_show_data(show,type)
		.then((data)=>db.run("UPDATE last_read SET number=MAX(number,$number) WHERE show=$show AND type=$type",
			{$number:Math.max(number,data[type]),
				$show:show,
				$type:type}));

}



get_episode_data = function (show,episode) {
	return db.get("SELECT * FROM episodes WHERE show=? AND number=?", show , episode)
		.then((resp)=>{return new Promise((r,e) => {
				if (!resp) {
					e("episode not found");
					return;
				}
				r({number:resp.number,
					identifier:resp.show,
					data:JSON.parse(resp.aditional_data)});
			});
		});
}

get_first = function (identifier) {
	return get_episode_data(identifier,1);
}

get_last = function (identifier) {
	return get_show(identifier).then((show)=>get_episode_data(identifier,show.number));
}

get_next = function (identifier,episode) {
	return get_episode_data(identifier,episode+1).catch((e)=>get_episode_data(identifier,episode)).catch(()=>undefined);
}


get_prev = function (identifier,episode) {
	return get_episode_data(identifier,episode-1).catch(()=>get_episode_data(identifier,episode)).catch(()=>undefined);
}

get_last_unread = function(identifier,type) {
	return db.get("SELECT show , number FROM last_read WHERE type=? AND show=?",
		type,identifier).then((data)=>get_next(data.show,data.number));
}

delete_show = function(identifier) {
	return get_show(identifier).then((show)=>{
		if (!show) {
			return identifier;
		}
		return Promise.resolve(show)
			.then((show)=>{
				config.shows.delete(identifier);
				return show;
			})
			.then(manager.stop_watcher)
			.then(()=>db.run("DELETE FROM shows WHERE identifier=?",identifier))
			.then(()=>db.run("DELETE FROM episodes WHERE show=?",identifier))
			.then(()=>db.run("DELETE FROM last_read WHERE show=?",identifier))
			.then(()=>shelljs.rm("-rf",show.directory))
			.catch(console.error)
			.return(identifier);
	})
}

get_show_data = function(identifier) {
	let data = {identifier:identifier};
	return db.all("SELECT number , type FROM last_read WHERE show=?",identifier)
	.map((row)=>{
		data[row.type]=row.number;
	})
	.then(()=>get_show(identifier))
	.then((show)=>{
		if (show) {
			data.type = show.type;
			if (show.logo) data.logo = true;			
		}
	})
	.return(data);
}

check_image_exists = function (show,image_url) {
	return db.get("SELECT number FROM episodes WHERE show=$show AND image_url=$image_url LIMIT 1", {
		$show:show,
		$image_url:image_url
	}).then((s)=>!!s);
}

module.exports = {
	get_shows : get_shows,
	resolve_path: resolve_path,
	add_new_show , add_new_show,
	delete_show : delete_show,
	init : init,
	close : close,
	insert_new_episode:insert_new_episode,
	update_last_read : update_last_read,
	get_next : get_next,
	get_prev :get_prev,
	get_last : get_last,
	get_first : get_first,
	get_episode_data : get_episode_data,
	get_show_data: get_show_data,
	get_pure_shows : get_pure_shows,
	get_pure_show : get_pure_show,
	get_show : get_show,
	check_image_exists : check_image_exists,
};
const manager = require('./../downloaders/manager');
const imdown = require('./../downloaders/image_sequence');
const app = require('./../webapp/app');