
const request = require('request')
const Promise = require('bluebird');
const express = require('express');
const db = require('../data/db');
const config = require('../data/config');
const path = require('path');

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
		.then((app)=>app.use(build_resource_url(show.identifier),express.static(show.directory)))
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
					data.src = build_resource_url(data.identifier,data.number + ".jpg");
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
		})
		.then((app)=>{
			app.get('/data/shows/',(req,res)=>{
				config.get_shows().map((show)=>{
					return db.get_show_data(show.identifier).then((data)=>{
						data.name = show.name;
						return data;
					})
				}).then((data)=>{
					res.json(data);
				}).done();
			});
			return app;
		}).then((app)=>{
			app.get('/data/shows/:show',(req,res)=>{
				db.get_show_data(req.params.show).then((data)=>{
					res.json(data);
				});
			});
			return app;
		}).then((app)=>{
			app.post('/data/shows/:show/:episode/:type',(req,res)=>{
				db.update_last_read(req.params.show,req.params.episode,req.params.type).done();
				res.end();
			});
			return app;
		}).then((app)=>{
			app.get('/function/get',(req,res)=>{
				request(req.query.url, function (error,response,body){
		   	 		if (error) {
		    			res.send("");
		    		return;
		    		}
				res.send(body);
				})
			});
			return app;
		});
}

setup_default = function () {
	app.use(function (req, res, next) {
  		res.sendFile(path.join(__dirname,"../../resources/index.html"));
	})
}

start_all = function (shows) {
	return serve_shows(shows)
		.then(serve_static_resources)
		.then(setup_data_calls)
		.then(setup_default);
}

build_resource_url = function() {
	let adress = ""
	if (arguments.length >= 1) adress = adress +"/shows/" + arguments[0];
	if (arguments.length >= 2) adress = adress + "/" + arguments[1];
	return adress;

}

module.exports = {
	serve_shows : serve_shows,
	serve_static_resources : serve_static_resources,
	start_all : start_all
}	