const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const mkdir = Promise.promisify(fs.mkdir);
const shelljs = require('shelljs');

var config = null;
const location = process.env.WATCHER_LOCATION;

const defaults = {
	interval : 15*60*1000 //15 Minutes
}



ensure_loaded = function () {
	return new Promise((r)=>{
		if (!config) db.get_shows().then((shows)=>{
			config = {shows:[],
					  shows_alt:{}};
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
	.then(()=>{config.shows[show.identifier] = show;
				return show;
	})
	.return(show);
}

add_new_show = function(show) {
	console.log("0");
	return delete_show(show.identifier).then(()=>console.log("1"))
	.then(()=>db.insert_new_show(show)).then(()=>console.log("2"))
	.then(()=>db.get_show(show.identifier))
	.then(perfrom_setup)
	.then(manager.add_watcher).then(()=>console.log("5"));
}

get_shows = function () {
	return ensure_loaded()
	.then(()=>Object.values(config.shows));
}

get_show = function (identifier) {
	return ensure_loaded()
	.then(()=>config.shows[identifier]);
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