//This is basically just a  test file that can be run to confirm that the components mostly function
//Basically I'll just be copying the JIT tests that I've written into here

const image_sequence = require('./downloaders/image_sequence');
const db = require('./data/db');
const config = require('./data/config');
const app = require('./webapp/app');
const fs = require('fs');
const Promise = require('bluebird');
const dom = require('xmldom').DOMParser;
const xpath = require('xpath').useNamespaces({"x": "http://www.w3.org/1999/xhtml"});

const test_db_name = "test.sqlite";
//delete database afterwards

test_db = function () {
    db.init(test_db_name)
    .then(()=>db.insert_new_show(       {
            identifier:"ggar",
            type : "webcomic",
            name : "Go Get A Roomie",
            image_xpath:"//div[@id='cc-comicbody']//img",
            next_xpath:"//div[@id='cc-comicbody']/a",
            text_xpath : "//div[@class='cc-newsbody']",
            base_url : "http://www.gogetaroomie.com/comic/catching-the-flusters"
        }))
    .then(db.close)
    .catch((e)=>console.error(e));
}


test_download = function () {
    db.init(test_db_name)
    .then(()=>db.insert_new_show({identifier:"mgn",base_url:"ggar.com"}))
    .then(()=>image_sequence.download_sequence(        {
            "identifier":"az",
            "name" : "Gunnerkrigg Court",
            "image_xpath" : "//div[@id='comic']//img",
            "next_xpath" : "//a[img[@alt='Next Comic']]",
            "base_url" : "http://www.awkwardzombie.com/index.php?page=0&comic=092006",
            directory : "E:\\test\\",
            thumbnail_dir : "E:\\test\\t\\",
            number : 1,
        }
    ))
    .then(db.close)
    .catch((e)=>{console.log(e)})
    .then(delete_test_db)
    .done();
}

/*
This assumes a config file is actually present
*/
test_config = function () {
    db.init(test_db_name)
    .then(config.get_shows)
    .then(db.resolve_shows)
    .then(console.log)
    .then(db.close)
    .done();
}

test_web_app = function () {
    db.init("database.sqlite")
    .then(config.get_shows)
    .then(db.resolve_shows)
    .then(app.start_all);
}

test_serve_static = function () {
    app.serve_static_resources()
    .then(app.serve_shows);
}


delete_test_db = function () {
    return config.resolve_path(test_db_name)
        .then(Promise.promisify(fs.unlink));
}

test_new_db =  function() {
    db.init("database.sqlite")
    .then(config.get_shows)
    .then(db.resolve_shows)
    .then(()=>db.get_next("ggar",2)).then(console.log)
    .then(()=>db.get_prev("ggar",1)).then(console.log)
    .then(()=>db.get_last("ggar")).then(console.log)
    .then(()=>db.get_first("ggar")).then(console.log);
}

get_test_file= function(name) {
    return new Promise((r,e)=>{
        let filename ="testpages/" + name ;
        console.log(filename);
        fs.readFile(filename, "utf8" ,(error,str)=>{
            if(error) e(error);
            r(str);
    })
    })
}

log_pass = function(data) {
    console.log(data);
    return data;
}


test_extract_aditional = function () {
    get_test_file("ggar.html").then(image_sequence.extract_body).then((body)=>{
        let show = {};
        show.doc = body;
        show.image_xpath = "//div[@id='cc-comicbody']//img";
        show.text_xpath = "//div[@class='cc-newsbody']";

        let episode={};
        return image_sequence.extract_aditional(episode,show,0);

    }).then(console.log);
}

test_create_thumbnail = function() {
	image_sequence.create_thumbnail({
		filename:"resources/images/double_arrow.jpg",
		thumbnail_name:"test.jpg"
	})
}
delete_test_db()
 test_download()

