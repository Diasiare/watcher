const request = require('request')
const Promise = require('bluebird');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer  = require('multer');
const upload = multer();

var expressWs = require('express-ws');

var app = null;
const PORT = 8080;

function heartbeat() {
  this.isAlive = true;
}


ensure_started = function () {
	return new Promise((r)=>{
		if (!app) {
			app = express();
			expressWs = expressWs(app);
			expressWs.getWss().on("error" ,(err,req,res)=>{
				console.log(err);
				res.end();
			});
			expressWs.getWss().on('connection', function connection(ws) {
  				ws.isAlive = true;
  				ws.on('pong', heartbeat);
			});
			setInterval(function ping() {
			  expressWs.getWss().clients.forEach(function each(ws) {
			    if (ws.isAlive === false) return ws.terminate();

			    ws.isAlive = false;
			    ws.ping('', false, true);
			  });
			}, 30000);


			app.get('/', function (req, res) {
  				res.redirect('/list');
			});
			app.listen(PORT);
			app.use( bodyParser.json() );       
			app.use(bodyParser.urlencoded({ 
  				extended: true
			})); 
			console.log('Running on http://localhost:' + PORT);
		}
		r(app);
	});
}

serve_shows = function (shows) {
	return Promise.all([ensure_started(),db.resolve_path("shows")])
		.then(([app,dir])=>app.use("/shows",express.static(dir)));
}

serve_static_resources = function () {
	return ensure_started()
		.then((app)=>app.use(express.static("resources")));
}


setup_data_calls = function () {
	return ensure_started()
		.then((app)=>{
			app.get('/data/shows/:show/:episode/:direction',(req,res)=>{
				res.set({
					"Cache-Control":"no-cache, no-store, must-revalidate"
				})
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
		}).then((app)=>{
			app.get('/data/shows/',(req,res)=>{
				res.set({
					"Cache-Control":"no-cache, no-store, must-revalidate"
				})
				get_shows_data()
				.then((data)=>{
					res.json(data);
				}).done();
			});
			return app;
		}).then((app)=>{
			app.get('/data/shows/:show',(req,res)=>{
				res.set({
					"Cache-Control":"no-cache, no-store, must-revalidate"
				})
				Promise.all([db.get_show_data(req.params.show),db.get_show(req.params.show)])
					.then(([data,show])=>{
					if (show) {
						data.name = show.name;
						data.episode_count = show.number;
					}
					if (data.logo) {
						data.logo = build_resource_url(data.identifier,"logo.jpg");
					}
					res.json(data);
				});
			});
			return app;
		}).then((app)=>{
			app.get('/data/backup.json',(req,res)=>{
				res.set({
					"Cache-Control":"no-cache, no-store, must-revalidate",
					"Content-Disposition": 'attachment; filename="backup.json"',
					"Content-Type" : "text/html"
				})
				db.get_pure_shows()
				.then((data)=>{
					res.send(JSON.stringify(data));
				}).done();
			});
			return app;
		}).then((app)=>{
			app.post('/data/backup.json',upload.single("backup"),(req,res)=>{
				Promise.resolve(JSON.parse(req.file.buffer))
				.map(db.add_new_show)
				.map(serve_show)
				.then(()=>res.json({
					failed:false
				}))
				.then(perform_callbacks)
				.catch((e)=>{
					res.json({
						failed:true,
						error:e
					});
					console.error(e);
				});
			});
			return app;
		}).then((app)=>{
			app.post('/data/shows/:show/:episode/:type',(req,res)=>{
				db.update_last_read(req.params.show,req.params.episode,req.params.type)
				.then(()=>perform_callbacks(req.params.show))
				.done();
				res.end();
			});
			return app;
		}).then((app)=>{
			app.post('/data/shows',(req,res)=>{
				let data = req.body;
				Promise.resolve(data)
				.then(db.add_new_show)
				.then(()=>res.json({
					identifier:data.identifier,
					failed:false
				}))
				.then(()=>perform_callbacks(data.identifier))
				.catch((e)=>{
					res.json({
						failed:true,
						error:e
					});
					console.error(e);
				});
			});
			return app;
		}).then((app)=>{
			app.get('/function/get',(req,res)=>{
				request({
						url:req.query.url,
						method:'GET',
						headers : {
							'User-Agent' : "request",
						}
					}, function (error,response,body){
			   	 		if (error) {
			    			res.send("");
			    		return;
			    		}
						res.send(body);
					})
				});
			return app;
		}).then((app)=>{
			app.delete('/data/shows/:show',(req,res)=>{
					db.delete_show(req.params.show)
						.then(()=>res.json({failed:false}))			
						.catch((e)=>{
							console.error(e);
							res.json({failed:true,error:e});
						})
						.then(()=>perform_callbacks(req.params.show));
				})
			return app;
		}).then((app)=>{
			app.ws('/socket/shows', (ws,req)=>{

				get_shows_data()
				.then((data)=>{
					try {
						ws.send(JSON.stringify({data:data,
							type:"all"}));
					} catch (e) {
						console.error(e);
					}
				})	
				ws.on("message",()=>{
					get_shows_data()
					.then((data)=>{
						try {
							ws.send(JSON.stringify({data:data,
								type:"all"}));
						} catch (e) {
							console.error(e);
						}
					})
				})
				ws.on("error",(e)=>{
					console.error(e);
				})	
			});
			return app;
		});
}

perform_callbacks = function(identifier) {
	if (app) {
		return Promise.all([db.get_show_data(identifier),db.get_show(identifier)])
			.then(([data,show])=>{
				if (!show || !data.type) return null;
				if (data) {
					data.name = show.name;
					data.episode_count = show.number;
				}
				if (data && data.logo) {
					data.logo = build_resource_url(data.identifier,"logo.jpg");
				} 
				return data;
			})
			.then((data)=>{
				for (let ws of expressWs.getWss().clients){
					try {
						ws.send(JSON.stringify({data:data,
												type:"single",
												id:identifier}));
					} catch (e) {
						console.error(e);
					}
				}
				return identifier;		
			});
	}
	return identifier;
}

get_shows_data = function() {
	return db.get_shows().map((show)=>{
		return db.get_show_data(show.identifier).then((data)=>{
			data.name = show.name;
			data.episode_count = show.number;
			if (data.logo) {
				data.logo = build_resource_url(data.identifier,"logo.jpg");
			}
			return data;
		})
	})
}

setup_default = function () {
	app.use("/",function (req, res, next) {
  		res.sendFile(path.join(__dirname,"../../resources/index.html"));
	})
	app.use("/read*",function (req, res, next) {
  		res.sendFile(path.join(__dirname,"../../resources/index.html"));
	})
	app.use("/list*",function (req, res, next) {
  		res.sendFile(path.join(__dirname,"../../resources/index.html"));
	})
	app.use("/new*",function (req, res, next) {
  		res.sendFile(path.join(__dirname,"../../resources/index.html"));
	})
	app.use(function (err, req, res, next) {
  		console.error(err.stack)
  		res.status(500).send('Something broke!')
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
	start_all : start_all,
	perform_callbacks : perform_callbacks
}	

const db = require('../data/config');