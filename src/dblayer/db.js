var db = require("sqlite");
const Promise = require("promise");

init = function (path) {
	return new Promise(function (r,e) {
		db.open(path).then(create_tables)
	})
}

create_tables = function() {
	db
}

const model = {
	shows:"""identifier TEXT NOT NULL,
	current_max INT NOT NULL,
	current_base_url,
	category TEXT NOT NULL,
	retreival_method TEXT NOT NULL,
	CONSTRAINT id_unique UNIQUE(identifier)
	""",
	episodes:"collection TEXT NOT NULL REFERENCES colections(rowid),
	number INT NOT NULL,
	url TEXT NOT NULL,
	real_name TEXT"
}

