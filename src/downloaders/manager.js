

const Promise = require('bluebird');
Promise.config({
    cancellation: true
});



const current_watchers = {};

watching_cycle = function (show) {
	return imdown.download_sequence(show).delay(show.interval)
		.then(watching_cycle);
}


start_watcher = function (show) {
	var ef = (e)=>{
		console.error("ERROR");
		console.error(e);
		console.error(show);
		console.error("Restarting\n\n");
		 //For the moment just log failures and restart.
		return Promise.resolve(show).delay(show.interval).then(watching_cycle).catch(ef);
	}
	var watcher = watching_cycle(show).catch(ef);;
	current_watchers[show.identifier] = watcher;
	return show;
}

add_watcher = function(show) {
	return Promise.resolve(show)
		.then(stop_watcher)
		.then(start_watcher);
	
}

stop_watcher = function(show) {
	if (show.identifier in current_watchers) {
		current_watchers[show.identifier].cancel();
	}
	return show;
}

start_watchers = function(shows) {
	return Promise.map(shows,add_watcher);
}

module.exports = {
	start_watchers : start_watchers,
	add_watcher : add_watcher,
	stop_watcher: stop_watcher
};
const imdown = require('./image_sequence');