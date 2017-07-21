

const Promise = require('bluebird');
const express = require('express');

var app = null;
const PORT = 8080;

ensure_started = function () {
	return new Promise((r)=>{
		if (!app) {
			app = express();
			app.get('/', function (req, res) {
  				res.send('Hello world\n');
			});
			app.listen(PORT);
			console.log('Running on http://localhost:' + PORT);
		}
		r(app);
	});
}

serve_shows = function (shows) {
	return Promise.map(shows, (show)=>{
		ensure_started()
		.then((app)=>app.use("/shows/" + show.identifier,express.static(show.directory)))
		.return(show);
	});
}

serve_static_resources = function () {
	return ensure_started()
		.then((app)=>app.use(express.static("resources")));
}

module.exports = {
	serve_shows : serve_shows,
	serve_static_resources : serve_static_resources
}