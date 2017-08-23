

const Promise = require('bluebird');
var started = false;
Promise.config({
    cancellation: true
});



const current_watchers = {};



watching_cycle = function (show) {
	if (!current_watchers[show.identifier].p ||
		!current_watchers[show.identifier].p.isPending())
		current_watchers[show.identifier].p = imdown.download_sequence(show).catch((e)=>{
		console.error("ERROR");
		console.error(e);
		console.error(show);
	});
}

start_watcher = function (show) {
	current_watchers[show.identifier] = {};
	watching_cycle(show);
	current_watchers[show.identifier].t = setInterval(watching_cycle,show.interval,show);
	return show;
}

add_watcher = function(show) {
	return Promise.resolve(show)
		.then(stop_watcher)
		.then(start_watcher);
}

stop_watcher = function(show) {
	if (show.identifier in current_watchers) {		
		clearInterval(current_watchers[show.identifier].t);
		current_watchers[show.identifier].p.cancel();	
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