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

const setup_download = function(show) {
    return download_sequence([show,build_sequence(show)]);
}

const build_sequence = function(show) {
    let sequence : any = {}
    sequence.restarts = 0;
    sequence.base_url = show.base_url;
    sequence.stop = false;
    sequence.number = show.number;
    if (show.number == 0) {
        sequence.download_this = true;
        sequence.initial = true;
    } else {
        sequence.download_this = false;
        sequence.initial = false;
    }
    sequence.check_all_episodes = true;
    return sequence;
}

const download_sequence =  function([show,sequence]) {
    return make_request([show,sequence])
    .then(download_images)
    .then(([show,sequence])=>{
            if (!is_last(sequence,show)) {
                console.log("CONTINUING " + show.number + " FOR " + show.identifier);
                var link = xpath("("+show.next_xpath + ")/@href",sequence.doc);         
                link = link[0].value;
                sequence.base_url = url.resolve(sequence.base_url,link);
                sequence.download_this = true;
                sequence.number = show.number;
                return Promise.delay(50).then(()=>
                    download_sequence([show,sequence]));
            } else {
                console.log("STOPPING " + show.number + " FOR " + show.identifier);
                sequence.download_this = false;
                sequence.initial = false;
                return show;
            }
    });
}

const make_request = function([show,sequence]) {
    return new Promise(function (resolve,reject) {
        request( {
            url:sequence.base_url,
            method:'GET',
            gzip : true,
            encoding:"utf-8",
            headers : {
                'User-Agent' : "request",
            }
        }, function (error,response,body){
            if (error) {
                if (error.code && error.code == "ECONNRESET"){
                    if (sequence.restarts < 10) {
                        resolve(Promise.delay(50).then(()=>
                            make_request([show,sequence])));
                        return ;                
                    }
                }
                reject(error);
                return;
            }
            sequence.restarts = 0;
            resolve(body);
        })
    })    
    .then(extract_body)
    .then((doc)=>sequence.doc=doc)
    .return([show,sequence]);

}

const redownload = function(identifier,episode) {
    return db.get_show(identifier)
        .then((show)=>{
            let sequence = build_sequence(show);
            sequence.number = episode-1;
            sequence.download_this = true;
            sequence.check_all_episodes = false;
            return db.get_episode_page_url(identifier,episode)
                .then((page_url)=>{
                    sequence.base_url = page_url
                    return [show,sequence]
                })
                .then(make_request)
                .then(download_images);
        })
}

const strip_uri = function(doc) {
    let v = new Set();
    strip_uri_rec(v,doc);
    return doc;
}

const strip_uri_rec = function(v,e) {
    v.add(e);
    if ('namespaceURI' in e) e.namespaceURI = null;
    for (var p in e) {
        if (!v.has(e[p]) &&
             e[p] !==null && 
             typeof(e[p])=="object") {
            strip_uri_rec(v,e[p]);
        }
    }
}


const extract_body = function(body) {
    var document = parse5.parse(body);
    var xhtml = xmlser.serializeToString(document);
    var doc = new dom().parseFromString(xhtml);
    return strip_uri(doc);
}

const is_last = function(sequence,show){
        var link = xpath("(" + show.next_xpath + ")/@href",sequence.doc);
        return link.length == 0 || url.resolve(sequence.base_url,link[0].value) == sequence.base_url ;
}

const create_thumbnail = function(data) {
    if (data.thumbnail_name) {
        return new Promise((r,error)=>{
                gm(data.filename)
                    .resize(100,150)
                    .write(data.thumbnail_name,(e)=>{
                        if (e) error(e);
                        else r(data);                       
                    });
            })
    }
    return data;
}

//Download an image
const download_image = function(data) {
    console.log(data)
    return new Promise((r,error)=>{gm(request({
        url:data.url,
        method:'GET',
        encoding:null,
        headers : {
            'User-Agent' : "request",
        }
        }))
        .selectFrame(0)
        .flatten()
        .write(data.filename,(e)=>{
            if (e) error(e);
            else r(data);
        }); 
    }).then(create_thumbnail)
    .catch((e)=>{
        console.error(e);
        return data;
    });
}

const extract_aditional =  function(episode,show,sequence,image_index) {
    let title = xpath("//title/text()",sequence.doc);
    episode.data = {};
    if (title.length > 0) episode.data.title = title[0].data;
    let alt_text = xpath("("+show.image_xpath + ")/@title" , sequence.doc);
    if (alt_text.length > image_index) episode.data.alt_text = alt_text[0].value;
    if (show.text_xpath) {
        let texts = xpath(show.text_xpath,sequence.doc);
        episode.data.text = texts.map((text)=>{
            return xmlser.serializeToString(text,true);
        });
    }

    return episode;

}

const download_images = function([show,sequence]) {
    return new Promise(function (resolve,reject){
        var image_xpath = show.image_xpath;
        var doc = sequence.doc;
        var identifier = show.identifier;
        if (sequence.download_this) {
            var images = xpath("("+image_xpath + ")/@src",doc)
                .map((rel_url)=>url.resolve(sequence.base_url,rel_url.value));
            let index = images.indexOf(show.last_episode_url)
            if (index > -1) {
                images.splice(index,1);
            }
            resolve(Promise.filter(images,(img)=>{
                if(sequence.check_all_episodes) {
                    return db.check_image_exists(show.identifier,img).then(b=>!b)
                } else {
                    return true;
                }
            }).map( function (image_url,index,length) {
                return new Promise ((resolve)=>{
                    var number = sequence.number+index+1;
                    var filename = path.join(show.directory,number+".jpg");
                    var thumbnail_name = path.join(show.thumbnail_dir,number+".jpg");
                    resolve({url:image_url
                        ,filename:filename
                        ,thumbnail_name:thumbnail_name
                        ,number:number
                        ,identifier:show.identifier
                        ,base_url:sequence.base_url});
                }).then((episode)=>extract_aditional(episode,show,sequence,index))
                .then(download_image)
                .then(db.insert_new_episode);
            })
            .return([show,sequence]));
        } else {
            resolve([show,sequence]);
        }
    });
}

export {
    setup_download as download_sequence,
    download_image,
    extract_body,
    extract_aditional,
    create_thumbnail,
    redownload,
};
import * as db from './../data/config';