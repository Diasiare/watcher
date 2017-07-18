const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const mkdir = Promise.promisify(fs.mkdir);
var config = null;

const defaults = {
	interval : 15*60*1000 //15 Minutes
}

ensure_loaded = function () {
	return new Promise((r)=>{
		if (!config) fs.readFile("config.json",(error,str)=>{
			config = JSON.parse(str);
			r(Promise.map(config.shows, load_defaults).return(config));
		}); 
		else r(config);
	});
}

load_defaults = function (show) {
	return Promise.map(Object.keys(defaults),  (name)=>{
		if (!(name in show)) show[name]=defaults[name];
	}).then(get_storage_location)
	.then((location)=>show.directory=path.join(location,show.identifier))
	.then(mkdir).catch(console.error).return(show);
}

get_shows = function () {
	return ensure_loaded().then(()=>config.shows);
}

get_storage_location = function () {
	return ensure_loaded().then(()=>config.storage_location);
}

module.exports = {
	get_shows : get_shows,
	get_storage_location : get_storage_location
};