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
		if (!config) fs.readFile("config.json", "utf8",(error,str)=>{
			config = JSON.parse(str);
			config.shows_alt = {};
			r(Promise.map(config.shows, load_defaults)
				.return(config));
		}); 
		else r(config);
	});
}

load_defaults = function (show) {
	return Promise.map(Object.keys(defaults),  (name)=>{
		if (!(name in show)) show[name]=defaults[name];
	})
	.then(()=>config.shows_alt[show.identifier] = show)
	.then(get_storage_location)
	.then((location)=>show.directory=path.resolve(location,show.identifier))
	.then((dir)=>shelljs.mkdir('-p',dir))
	.catch(console.error)
	.return(show);
}

get_shows = function () {
	return ensure_loaded().then(()=>config.shows);
}

get_show = function (identifier) {
	return ensure_loaded().then(()=>config.shows_alt[identifier]);
}

get_storage_location = function () {
	return ensure_loaded().then(()=>location);
}

resolve_path = function (filename) {
	return get_storage_location().then((location)=>path.resolve(location,filename));
}

module.exports = {
	get_shows : get_shows,
	resolve_path: resolve_path,
	get_show : get_show
};