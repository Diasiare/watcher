const db = require("sqlite");
const Promise = require("bluebird");

const model = {
	shows:`identifier TEXT NOT NULL PRIMARY KEY,
	data TEXT
	`,
	episodes:`show TEXT NOT NULL REFERENCES shows(identifier) ON DELETE CASCADE,
	number INT NOT NULL,
	image_url TEXT NOT NULL,
	page_url TEXT NOT NULL,
	aditional_data TEXT,
	CONSTRAINT episodes_pkey PRIMARY KEY (show,number) ON CONFLICT REPLACE
	`,
	last_read: `show TEXT NOT NULL REFERENCES shows(identifier) ON DELETE CASCADE,
	type TEXT NOT NULL,
	number INT NOT NULL,
	CONSTRAINT unread_pkey PRIMARY KEY(show,type) ON CONFLICT REPLACE
	`


}

init = function (path) {
	return config.resolve_path(path).then((full_path)=>db.open(full_path, {Promise})).then(create_tables);
}

close = function () {
	console.log("DATABASE CLOSED")
	return db.close();
}

create_tables = function() {
	return Promise.each(Object.keys(model),  (t_name)=>{
			return db.exec("CREATE TABLE IF NOT EXISTS " + t_name + " ( " + model[t_name] + " )");
		}
	);
}

insert_new_episode = function (data) {
	var identifier = data.identifier;
	var number = data.number;
	var image_url = data.url;
	var page_url = data.base_url;
	var aditional_data = {};
	if ('data' in data) aditional_data = data.data;
	aditional_data = JSON.stringify(aditional_data);
	return db.run("INSERT INTO episodes VALUES(?,?,?,?,?)", identifier, number, image_url , page_url
		, aditional_data)
	.then(()=>app.perform_callbacks(data.identifier))
	.return(data);
}

//We store the data as a json object because that is much easier as the format needs to be
//wastly different for differnt types of shows (image_sequence, torrent, tv, etc), the overhead should be minimal
//As this table should only rarely be written to
insert_new_show = function (data) {
	var identifier = data.identifier;
	var aditional_data = JSON.stringify(data);
	return Promise.resolve("").then(()=>db.run("INSERT INTO shows VALUES(?,?)", identifier, aditional_data))
	.then(()=>db.run("INSERT INTO last_read VALUES(?,?,?)",identifier,"reread",1))
	.then(()=>db.run("INSERT INTO last_read VALUES(?,?,?)",identifier,"new",1))
	.return(data);
}


update_last_read = function(show,number,type) {
	if (type != "new" )
		return db.run("UPDATE last_read SET number=$number WHERE show=$show AND type=$type",
			{$number:number,
				$show:show,
				$type:type});
	else 
		return get_show_data(show,type)
		.then((data)=>db.run("UPDATE last_read SET number=MAX(number,$number) WHERE show=$show AND type=$type",
			{$number:Math.max(number,data[type]),
				$show:show,
				$type:type}));

}


get_shows = function() {
	return db.all("SELECT data FROM shows")
		.map((show)=>Promise.resolve(JSON.parse(show.data))
			.then(resolve_show));
}

get_pure_shows = function() {
	return db.all("SELECT data FROM shows")
		.map((show)=>Promise.resolve(JSON.parse(show.data)));
}

get_pure_show = function(identifier) {
	return db.get("SELECT data FROM shows WHERE identifier=?", identifier)
		.then((show)=>{
			if (show) return Promise.resolve(JSON.parse(show.data));
			else return show;
		});
}
get_show = function(identifier) {
	return db.get("SELECT data FROM shows WHERE identifier=?",identifier)
		.then((show)=>JSON.parse(show.data))
		.then(resolve_show);
}

resolve_show = function (item) {
		return db.get("SELECT number , page_url FROM episodes WHERE show=? ORDER BY number DESC;"
			,item.identifier).then((row)=>{
			if (row == undefined) {
				item.number = 0;
			} else {
				item.number = row.number;
				item.base_url = row.page_url;
			}
			return item;
		});
}

get_episode_data = function (show,episode) {
	return db.get("SELECT * FROM episodes WHERE show=? AND number=?", show , episode)
		.then((resp)=>{return new Promise((r,e) => {
				if (!resp) {
					e("episode not found");
					return;
				}
				r({number:resp.number,
					identifier:resp.show,
					data:JSON.parse(resp.aditional_data)});
			});
		});
}

get_first = function (identifier) {
	return get_episode_data(identifier,1);
}

get_last = function (identifier) {
	return config.get_show(identifier).then((show)=>get_episode_data(identifier,show.number));
}

get_next = function (identifier,episode) {
	return get_episode_data(identifier,episode+1).catch((e)=>get_episode_data(identifier,episode)).catch(()=>undefined);
}


get_prev = function (identifier,episode) {
	return get_episode_data(identifier,episode-1).catch(()=>get_episode_data(identifier,episode)).catch(()=>undefined);
}

get_last_unread = function(identifier,type) {
	return db.get("SELECT show , number FROM last_read WHERE type=? AND show=?",
		type,identifier).then((data)=>get_next(data.show,data.number));
}

get_show_data = function(identifier) {
	let data = {identifier:identifier};
	return db.all("SELECT number , type FROM last_read WHERE show=?",identifier)
	.map((row)=>{
		data[row.type]=row.number;
	})
	.then(()=>config.get_show(identifier))
	.then((show)=>{
		if (show) {
			data.type = show.type;
			if (show.logo) data.logo = true;			
		}

	})
	.return(data);
}

delete_show = function(identifier) {
	return db.run("DELETE FROM shows WHERE identifier=?",identifier)
		.then(()=>db.run("DELETE FROM episodes WHERE show=?",identifier))
		.then(()=>db.run("DELETE FROM last_read WHERE show=?",identifier));
}

module.exports = {
	init : init,
	close : close,
	insert_new_episode:insert_new_episode,
	update_last_read : update_last_read,
	insert_new_show: insert_new_show,
	resolve_show : resolve_show,
	get_next : get_next,
	get_prev :get_prev,
	get_last : get_last,
	get_first : get_first,
	get_episode_data : get_episode_data,
	get_show_data:get_show_data,
	get_shows : get_shows,
	get_pure_shows : get_pure_shows,
	get_pure_show : get_pure_show,
	get_show : get_show,
	delete_show : delete_show
};
const config = require('./config');
const app = require('./../webapp/app');