const fs = require('fs');
const Promise = require('bluebird');

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
	});
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