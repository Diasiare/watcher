/**
*Module for handling the watching and downloading of images
**/
const request = require('request');
const fs = require('fs');
const gm = require('gm').subClass({imageMagick: true});
const xpath = require('xpath').useNamespaces({"x": "http://www.w3.org/1999/xhtml"});
const parse5 = require('parse5');
const xmlser = require('xmlserializer');
const dom = require('xmldom').DOMParser;
const path = require('path');
const url = require('url');
const Promise = require('bluebird');
const db = require('./../data/db')

//Download a sequence of images
var download_sequence =  function(data) {
	return new Promise(function (resolve,reject) {
		request(data.base_url, function (error,response,body){
		    if (error) reject(error);
		    var document = parse5.parse(body);
		    var xhtml = xmlser.serializeToString(document);
		    var doc = new dom().parseFromString(xhtml);
			data.doc=doc
			resolve(data);
		})
	}).then(download_images).then(
		function (data){
			console.log("HANDLING " + data.number);
			if (!is_last(data.doc,data.base_url,data.next_xpath)) {
				var link = xpath(xpath_replace(data.next_xpath + "/@href"),data.doc);
				link = link[0].value;
				data.base_url = url.resolve(data.base_url,link);
				data.download_this = true;
				return Promise.delay(50).then(()=>
					download_sequence(data))
			} else {
				return db.update_show(data).then(()=>data);
			}
	});
}

var	is_last = function(doc,base_url,next_xpath){
		var link = xpath(xpath_replace(next_xpath + "/@href"),doc);
		return link.length == 0 || url.resolve(base_url,link[0].value) == base_url;
}


//Download an image
var download_image = function(data) {
	return new Promise((r,e)=>{gm(request(data.url)).write(data.filename,e);
		r(data)
	});
}

var xpath_replace = function(s) {
	return s.replace(/\/(?=[a-zA-Z])/g,"/x:")
}

var download_images = function(data) {
	return new Promise(function (resolve,reject){
		var image_xpath = data.image_xpath;
		var doc = data.doc;
		var identifier = data.identifier;
		var csn = data.number;
		if (data.download_this) {
			var images = xpath(xpath_replace(image_xpath + "/@src"),doc);
			Promise.map(images, function (rel_image_url,index,length) {
				return new Promise ((resolve)=>{
					var number = data.number+index+1;
					var image_url = url.resolve(data.base_url,rel_image_url.value);
					var filename = path.join(data.directory,number+".jpg");
					resolve({url:image_url
						,filename:filename
						,number:number
						,identifier:data.identifier});
				}).then(download_image)
				.then(db.insert_new_episode);
			}).then(()=>data.number = data.number + images.length)
			.then(()=>resolve(data));
		} else {
			resolve(data);
		}
	});
}

module.exports = {
	download_sequence : download_sequence
};