const fs = require('fs');
const Promise = require('bluebird');

var config = null;


ensure_loaded = function () {
	return new Promise(()=>
		if (!config) fs.readFile("config.json",(error,str)=>{
			config = JSON.parse(str);
		});
	)
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