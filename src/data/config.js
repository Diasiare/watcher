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
	.then(()=>{config.shows[show.identifier] = show;
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
	get_show(identifier).then((show)=>{
		if (!show) {
			return identifier;
		}
		return Promise.resolve(show)
			.then(manager.stop_watcher)
			.then(()=>db.delete_show(identifier))
			.then(()=>shelljs.rm("-rf",show.directory))
			.catch(console.error);
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