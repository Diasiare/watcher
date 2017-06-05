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
const path = require('path').posix;
const url = require('url');

//Download a sequence of images
//Due to some stupid stuff the xpaths have to be in the x namespace so /html should be /x:html
var download_sequence =  function(base_url, image_xpath, next_xpath, indentifier, sequence_number ,download_this) {
	request(base_url, function (error,response,body){
		    var document = parse5.parse(body);
		    var xhtml = xmlser.serializeToString(document);
		    var doc = new dom().parseFromString(xhtml);
			var csn = sequence_number;
			var image_url;

			//Download each image
			if (download_this) {
				var images = xpath(xpath_replace(image_xpath + "/@src"),doc);
				for (var i = 0;i<images.length;i++){
					var image_url = url.resolve(base_url,images[i].value);
					var filename = path.join(indentifier,sequence_number+".jpg");
					
					fs.mkdir(indentifier, function (err) {
						download_image(image_url, filename,
							function (error){
								if (error) console.error("Download " + image_url + " to " + filename , error);
							}
						);
					});

					csn++;
				}
			}

			
			if (!is_last(doc,base_url,next_xpath)) {
				var link = xpath(xpath_replace(next_xpath + "/@href"),doc);
				link = link[0].value;
				var next_url = url.resolve(base_url,link);
				setTimeout(function () {download_sequence(next_url,image_xpath,next_xpath,indentifier,csn,true);}, 50);
			} else {
				//TODO Register success and update database here
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
	console.log(s + "         " +s.replace(/\/(?=[a-zA-Z])/g,"/x:"))
	return s.replace(/\/(?=[a-zA-Z])/g,"/x:")
}

module.exports = {
	download_sequence : download_sequence
};