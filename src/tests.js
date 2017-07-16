//This is basically just a  test file that can be run to confirm that the components mostly function
//Basically I'll just be copying the JIT tests that I've written into here

const image_sequence = require('./image_sequence/image_sequence');
const db = require('./dblayer/db');



//delete database afterwards
/*
(async ()=>{var x =  await (db.init("./test.sqlite").then(()=>db.insert_new_show(
	{identifier:"ggar",base_url:"ggar.com"})).then(()=>db.insert_new_episode(
	{identifier:"ggar",url:"ggar.com/1.jpg",number:1,name:"A Name"})).then(()=>db.update_show(
	{identifier:"ggar",number:1,base_url:"ggar.com/1"})).then(db.close).catch((e)=>console.error(e)))})();
*/

(async ()=>{var x =  await (db.init("./test.sqlite")
	.then(()=>image_sequence.download_sequence({base_url:"http://www.gogetaroomie.com/comic/rolling-with-it",
	image_xpath:"//div[@id='cc-comicbody']//img",
	next_xpath:"//div[@id='cc-comicbody']/a",
	identifier:"ggar", 
	number:0 , download_this:true})).then(db.close).done())})();
