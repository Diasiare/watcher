
const Promise = require('bluebird');
const fs = require('fs');
const shell = require('shelljs');
const path = require('path');

const db_name = "database.sqlite"

patch = function () {
	return db.resolve_path("shows")
	.then((shows)=>{
		if (!fs.existsSync(shows)) {
			return db.resolve_path("")
			.then((dir)=>fs.readdirSync(dir)
				.map((f)=>path.join(dir,f)))
			.map((file)=>{
				console.log("moving",file);
				if(fs.statSync(file).isDirectory()){				
					let name = path.basename(file);
					return db.resolve_path(path.join("shows",name))
					.then((file)=>shell.mkdir("-p",file))
					.then(()=>fs.readdirSync(file)
						.map((f)=>path.join(file,f)))					
					.map((f)=>{
						console.log("moving file:",f)
						return db.resolve_path(path.join("shows",name))
						.then((d)=>shell.mv(f,d));
					})
					.then(()=>shell.rm("-r",file));
				}
				return null;
			})
		}
		return null;
	})
}


start = function (db_name) {
		return Promise.resolve()
		.then(patch)
		.return(db_name)
		.then(db.init)
		.then(db.get_shows)
		.then(app.start_all)
		.then(db.get_shows)
		.then(manager.start_watchers)
		.done();
}

const image_sequence = require('./downloaders/image_sequence');
const db = require('./data/config');
const manager = require('./downloaders/manager');
const app = require('./webapp/app');
start(db_name);


