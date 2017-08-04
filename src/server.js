const image_sequence = require('./downloaders/image_sequence');
const db = require('./data/db');
const config = require('./data/config');
const manager = require('./downloaders/manager');
const app = require('./webapp/app');
const Promise = require('bluebird');

// Constants
const db_name = "database.sqlite"

const tmp_shows = [
    	{
            identifier:"ggar",
            type : "webcomic",
            name : "Go Get A Roomie",
            image_xpath:"//div[@id='cc-comicbody']//img",
       	    next_xpath:"//div[@id='cc-comicbody']/a",
            text_xpath : "//div[@class='cc-newsbody']",
            base_url : "http://www.gogetaroomie.com/comic/catching-the-flusters"
    	},
        {
            identifier:"gunn",
            type : "webcomic",
            name : "Gunnerkrigg Court",
            image_xpath : "//img[@class='comic_image']",
            next_xpath : "//a[./img[@src='http://www.gunnerkrigg.com/images/next_a.jpg']]",
            base_url : "http://www.gunnerkrigg.com/?p=1856"
        }
];

add_tmp = function(shows) {
	
	return Promise.map(tmp_shows,(tmp_show)=>{
		return config.get_show(tmp_show.identifier).then((show)=>{
			if (!show) return config.add_new_show(tmp_show);
			return show;
		});
	})
	.then(config.get_shows);
}

start = function (db_name) {
	return db.init(db_name)
		.then(config.get_shows)
		.then(add_tmp)
		.then(app.start_all)
		.then(config.get_shows)
		.then(manager.start_watchers)
		.done();
}



start(db_name);


