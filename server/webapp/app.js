

const Promise = require('bluebird');
const express = require('express');
const db = require('../data/db')

var app = null;
const PORT = 8080;

ensure_started = function () {
	return new Promise((r)=>{
		if (!app) {
			app = express();
			app.get('/', function (req, res) {
  				res.redirect('/index.html');
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

setup_data_calls = function () {
	return ensure_started()
		.then((app)=>{
			app.get('/data/shows/:show/:episode/:direction',(req,res)=>{
				let respond = (data)=>{
					data.src = "/shows/" + req.params.show + "/" + data.number + ".jpg";
					res.json(data);
				}
				let episode = parseInt(req.params.episode);
				if (req.params.direction === "last") db.get_last(req.params.show).then(respond);
				else if (req.params.direction === "first") db.get_first(req.params.show).then(respond);
				else if (req.params.direction === "next") db.get_next(req.params.show,episode)
					.then(respond);
				else if (req.params.direction === "prev") db.get_prev(req.params.show,episode)
					.then(respond);
				else if (req.params.direction === "current") db.get_episode_data(req.params.show,episode)
					.then(respond);
			});
			return app;
		});
}

start_all = function (shows) {
	return serve_shows(shows)
		.then(serve_static_resources)
		.then(setup_data_calls);
}

module.exports = {
	serve_shows : serve_shows,
	serve_static_resources : serve_static_resources,
	start_all : start_all
}	