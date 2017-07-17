

const Promise = require('bluebird');
const imdown = require('image_sequence');

const current_watchers = {};

watching_cycle = function (show) {
	return imdown(show).delay(show.interval).then(watching_cycle);
}


start_watcher = function (show) {
	var ef = (e)=>{
		console.error("ERROR");
		console.error(e);
		console.error(show);
		console.error("Restarting\n\n");
		 //For the moment just log failures and restart.
		return watching_cycle(show).catch(ef);
	}
	var watcher = watching_cycle(show).catch(ef);;
	current_watchers[show.identifier] = watcher;
	return watcher;
}


start_watchers = function(shows) {
	return Promise.map(shows,start_watcher);
}

module.exports = {
	start_watchers : start_watchers,
};