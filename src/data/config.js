const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const mkdir = Promise.promisify(fs.mkdir);
const shelljs = require('shelljs');

const config = {shows:new Map()};
const location = process.env.WATCHER_LOCATION;
var loaded = false;

const defaults = {
	interval : 15*60*1000 //15 Minutes
}



ensure_loaded = function () {
	return new Promise((r)=>{
		if (!loaded) db.get_shows().then((shows)=>{
			loaded=true;
			r(Promise.map(shows, perfrom_setup)
				.return(config));
		}); 
		else r(config);
	});
}

//Load default values and ensure that directories exist
perfrom_setup = function (show) {
	return Promise.map(Object.keys(defaults),  (name)=>{
		if (!(name in show)) show[name]=defaults[name];
	})
	.then(()=>resolve_path(show.identifier))
	.then((d)=>{show.directory=d;return d})
	.then((dir)=>shelljs.mkdir('-p',dir))
	.catch(console.error)
	.then(()=>resolve_path(path.join(show.identifier,"thumbnails")))
	.then((d)=>{show.thumbnail_dir=d;return d})
	.then((dir)=>shelljs.mkdir('-p',dir))
	.catch(console.error)
	.then(()=>{
		if (show.logo && !fs.existsSync(path.join(show.directory,"logo.jpg"))) {
			return imdown.download_image({url:show.logo,
				filename:path.join(show.directory,"logo.jpg")})
			.catch((e)=>{
				console.error(e);
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

add_new_show = function(show) {
	return delete_show(show.identifier)
	.then(()=>db.insert_new_show(show))
	.then(()=>db.get_show(show.identifier))
	.then(perfrom_setup)
	.then(manager.add_watcher);
}

get_shows = function () {
	return ensure_loaded()
	.then(()=>config.shows.values());
}

get_show = function (identifier) {
	return ensure_loaded()
	.then(()=>config.shows.get(identifier));
}

get_storage_location = function () {
	return Promise.resolve(location)
	.then((dir)=>shelljs.mkdir('-p',dir))
	.return(location);
}

resolve_path = function (filename) {
	return get_storage_location()
	.then((location)=>path.resolve(location,filename));
}

delete_show = function(identifier) {
	return get_show(identifier).then((show)=>{
		if (!show) {
			return identifier;
		}
		return Promise.resolve(show)
			.then((show)=>{
				console.log("CALLED");
				config.shows.delete(identifier);
				return show;
			})
			.then(manager.stop_watcher)
			.then(()=>db.delete_show(identifier))
			.then(()=>shelljs.rm("-rf",show.directory))
			.catch(console.error)
			.return(identifier);
	})
}

module.exports = {
	get_shows : get_shows,
	resolve_path: resolve_path,
	add_new_show , add_new_show,
	get_show : get_show,
	delete_show : delete_show
};
const db = require('./db');
const manager = require('./../downloaders/manager');
const imdown = require('./../downloaders/image_sequence');