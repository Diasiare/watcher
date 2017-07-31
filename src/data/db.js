const db = require("sqlite");
const Promise = require("bluebird");
const config = require('./config');

const model = {
	shows:`identifier TEXT NOT NULL PRIMARY KEY,
	aditional_data TEXT
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
			db.exec("CREATE TABLE IF NOT EXISTS " + t_name + " ( " + model[t_name] + " )");
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
		, aditional_data).return(data);
}

insert_new_show = function (data) {
	var identifier = data.identifier;
	var aditional_data = null;
	if ('aditional_data' in data) aditional_data = data.aditional_data;
	return db.run("INSERT INTO shows VALUES(?,?)", identifier, aditional_data)
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


/*
Ensures that each show in the config file is in the databse and that the data objects
are up to date
*/
resolve_shows = function (shows) {
	return Promise.map(shows,(item)=>{
		return db.get("SELECT number , page_url FROM episodes WHERE show = ? ORDER BY number DESC;"
			,item.identifier).then((row)=>{
			if (row == undefined) return insert_new_show(item).then(()=>{
				item.number = 0;
				item.download_this = true;
				item.intital_run = true;
			}).return(item);
			else {
				item.number = row.number;
				item.base_url = row.page_url;
				item.download_this=false;
				item.intital_run = false;
				return item;
			}
		})
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
	return db.get("SELECT show , number FROM last_read WHERE type = ? AND show = ?",
		type,identifier).then((data)=>get_next(data.show,data.number));
}

get_show_data = function(identifier) {
	let data = {identifier:identifier};
	return db.all("SELECT number , type FROM last_read WHERE show = ?",identifier)
	.map((row)=>{
		data[row.type]=row.number;
	}).then(()=>config.get_show(identifier)).then((show)=>{
		data.type = show.type;
	})
	.return(data);
}

module.exports = {
	init : init,
	close : close,
	insert_new_episode:insert_new_episode,
	update_last_read : update_last_read,
	insert_new_show:insert_new_show,
	resolve_shows : resolve_shows,
	get_next : get_next,
	get_prev :get_prev,
	get_last : get_last,
	get_first : get_first,
	get_episode_data : get_episode_data,
	get_show_data:get_show_data
};