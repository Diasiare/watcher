const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const mkdir = Promise.promisify(fs.mkdir);
const shelljs = require('shelljs');
const db = require('./db');

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
	.then(()=>{config.shows_alt[show.identifier] = show;
				config.shows.push(show); 
				return show;
	})
	.return(show);
}

add_new_show = function(show) {
	return db.insert_new_show(show)
	.then(perfrom_setup);
}

get_shows = function () {
	return ensure_loaded()
	.then(()=>config.shows);
}

get_show = function (identifier) {
	return ensure_loaded()
	.then(()=>config.shows_alt[identifier]);
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

module.exports = {
	get_shows : get_shows,
	resolve_path: resolve_path,
	add_new_show , add_new_show,
	get_show : get_show
};