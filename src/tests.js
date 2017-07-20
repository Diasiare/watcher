//This is basically just a  test file that can be run to confirm that the components mostly function
//Basically I'll just be copying the JIT tests that I've written into here

const image_sequence = require('./downloaders/image_sequence');
const db = require('./data/db');
const config = require('./data/config');
const fs = require('fs');
const Promise = require('bluebird');

const test_db_name = "test.sqlite";
//delete database afterwards

test_db = function () {
	db.init(test_db_name).then(()=>db.insert_new_show(
	{identifier:"ggar",base_url:"ggar.com"})).then(()=>db.insert_new_episode(
	{identifier:"ggar",url:"ggar.com/1.jpg",number:1,name:"A Name"})).then(()=>db.update_show(
	{identifier:"ggar",number:1,base_url:"ggar.com/1"})).then(db.close).then(delete_test_db)
	.catch((e)=>console.error(e));
}


test_download = function () {
	db.init(test_db_name).then(()=>db.insert_new_show({identifier:"ggar",base_url:"ggar.com"}))
	.then(()=>image_sequence.download_sequence({base_url:"http://www.gogetaroomie.com/comic/rolling-with-it",
	image_xpath:"//div[@id='cc-comicbody']//img",
	next_xpath:"//div[@id='cc-comicbody']/a",
	identifier:"ggar", number:0 , download_this:true}))
	.then(db.close).then(delete_test_db).done()
}

/*
This assumes a config file is actually present
*/
test_config = function () {
	db.init(test_db_name).then(config.get_shows).then(db.resolve_shows).then(console.log)
	.then(db.close).then(delete_test_db).done();
}

delete_test_db = function () {
	return config.resolve_path(test_db_name).then(Promise.promisify(fs.unlink));
}

