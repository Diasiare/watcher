const $ = require("jquery");

var listeners = new Map();
var data = null;


function preload_data() {
	$.get("/data/shows", (info)=>{
		data = info;
		run_callbacks();
	});
}

function run_callbacks() {
	for (let key of listeners.keys()) {
		run_callback(key);
	}
}

function run_callback(o) {
	let tmp = {};
	let {status,type} = listeners.get(o); 
	let items = data;
	if (type) items = items.filter((item)=>{
		return type===item.type;
	});
	tmp[status] = items;
	o.setState(tmp);
}

function add_listener(o,status,...rest) {
	let tmp = {};
	tmp.status = status;
	if (rest.length > 0) tmp.type = rest[0];
	listeners.set(o,tmp);
	if (data) {
		run_callback(o);
	}
}

function remove_listener(o) {
	listeners.delete(o);
}


module.exports = {
	preload_data : preload_data,
	register_listener : add_listener,
	remove_listener : remove_listener
}




