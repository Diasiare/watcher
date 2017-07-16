const db = require("sqlite");
const Promise = require("bluebird");

const model = {
	shows:`identifier TEXT NOT NULL PRIMARY KEY,
	current_max INT NOT NULL,
	current_base_url TEXT,
	aditional_data TEXT
	`,
	episodes:`show TEXT NOT NULL REFERENCES shows(identifier) ON DELETE CASCADE,
	number INT NOT NULL,
	url TEXT NOT NULL,
	real_name TEXT,
	aditional_data TEXT,
	CONSTRAINT episodes_pkey PRIMARY KEY (show,number)`
}

init = function (path) {
	return db.open(path, {Promise}).then(create_tables);
}

close = function () {
	console.log("DATABASE CLOSED")
	return db.close();
}

create_tables = function(unused) {
	return Promise.each(["shows","episodes"],  (t_name)=>{
			db.exec("CREATE TABLE IF NOT EXISTS " + t_name + " ( " + model[t_name] + " )");
		}
	);
}

insert_new_episode = function (data) {
	var identifier = data.identifier;
	var number = data.number;
	var url = data.url;
	var real_name = null;
	if ('name' in data) real_name = data.name;
	var aditional_data = null;
	if ('aditional_data' in data) aditional_data = data.aditional_data;
	return db.run("INSERT INTO episodes VALUES(?,?,?,?,?)", identifier, number, url, real_name, aditional_data);
}

insert_new_show = function (data) {
	var identifier = data.identifier;
	var current_max = 0;
	var current_base_url = data.base_url;
	var aditional_data = null;
	if ('aditional_data' in data) aditional_data = data.aditional_data;
	return db.run("INSERT INTO shows VALUES(?,?,?,?)", identifier, current_max, current_base_url, aditional_data);
}

update_show = function (data) {
	return db.run("UPDATE shows SET current_max= $current_max ,current_base_url= $base_url WHERE identifier= $identifier",
		{$identifier:data.identifier,
			$current_max:data.number,
			$base_url:data.base_url});
}

resolve_config = function (shows) {
	return Promise.map(shows,(item)=>{
		return db.get("SELECT * FROM shows WHERE identifier = ?",item).then((row)=>{
			if (row == undefined) return insert_new_show(item).then(()=>{
				item.number = 0;
			});
			else {
				item.number = row.current_max;
				item.base_url = row.current_base_url;
				return item;
			}
		})
	});
}

module.exports = {
	init : init,
	close : close,
	insert_new_episode:insert_new_episode,
	update_show:update_show,
	insert_new_show:insert_new_show
};