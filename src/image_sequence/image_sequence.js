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

//Download a sequence of images
//Due to some stupid stuff the xpaths have to be in the x namespace so /html should be /x:html
var download_sequence =  function(base_url, image_xpath, next_xpath, identifier, sequence_number ,download_this) {
	return new Promise(function (resolve,reject) {
		request(base_url, function (error,response,body){
		    if (error) reject(error);
		    console.log("stuff");
		    var document = parse5.parse(body);
		    var xhtml = xmlser.serializeToString(document);
		    var doc = new dom().parseFromString(xhtml);
			var csn = sequence_number;
			resolve({sequence:csn,
				doc:doc,
				image_xpath:image_xpath,
				identifier:identifier,
				download_this:download_this,
				next_xpath:next_xpath,
				base_url:base_url});
		})
	}).then(download_images).then(
		function (data){
			if (!is_last(data.doc,data.base_url,data.next_xpath)) {
				var link = xpath(xpath_replace(data.next_xpath + "/@href"),data.doc);
				link = link[0].value;
				data.next_url = url.resolve(data.base_url,link);
				data.download_this = true;
				return new Promise(function (r) {setTimeout(r,50,data)}).then(function () {
					download_sequence(data.next_url,data.image_xpath,data.next_xpath
						,data.identifier,data.sequence,true)})
			} else {
				return new Promise(function (resolve) {
					//TODO SAVE RESULTS
				})
			}
	});
}

var	is_last = function(doc,base_url,next_xpath){
		var link = xpath(xpath_replace(next_xpath + "/@href"),doc);
		return link.length == 0 || url.resolve(base_url,link[0].value) == base_url;
}


//Download an image
var download_image = function(url ,  filename, err) {
	gm(request(url)).write(filename,err);
}

var xpath_replace = function(s) {
	return s.replace(/\/(?=[a-zA-Z])/g,"/x:")
}

var download_images = function(data) {
	return new Promise(function (resolve,reject){
		var image_xpath = data.image_xpath;
		var doc = data.doc;
		var identifier = data.identifier; 
		var base_url = data.base_url;
		var csn = data.sequence;
		var download_this = data.download_this;
		if (download_this) {
			var images = xpath(xpath_replace(image_xpath + "/@src"),doc);
			var final_url = undefined;
			for (var i = 0;i<images.length;i++){
				var image_url = url.resolve(base_url,images[i].value);
				var filename = path.join(identifier,csn+".jpg");
	
				fs.mkdir(identifier, function (err) {
					download_image(image_url, filename,
						function (error){
							reject({sequence:csn,
								url:image_url,
								name:filename,
								base_url:base_url})
						}
					);
				});
				data.final_url = image_url;
				csn++;
			}
		}
		data.sequence = csn;
		resolve(data);
	});
}

module.exports = {
	download_sequence : download_sequence
};