/**
 *Module for handling the watching and downloading of images
 **/

import * as request from 'request';
import * as magick from 'gm';
import * as uninitalized_xpath from 'xpath';
import * as parse5 from 'parse5';
import * as xmlser from 'xmlserializer';
import {DOMParser as dom} from 'xmldom';
import * as path from 'path';
import * as url from 'url';
import * as Promise from 'bluebird';
import ShowFields from '../types/Show';
import Episode from '../types/Episode';
//Download a sequence of images

const gm = magick.subClass({imageMagick: true});
const xpath = uninitalized_xpath.useNamespaces({"x": "http://www.w3.org/1999/xhtml"});


interface Sequence {
    base_url: string,
    restarts: number,
    stop: boolean,
    number: number,
    download_this: boolean,
    initial: boolean,
    check_all_episodes: boolean,
    doc: any,
    show: Show
}

const setup_download = function (show: Show) {
    return download_sequence(build_sequence(show));
}

const build_sequence = function (show: Show) {
    let sequence: Sequence = <any> {}
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
    sequence.show = show;
    return sequence;
}

const download_sequence = function (sequence: Sequence): Promise<Show> {
    return make_request(sequence)
        .then(download_images)
        .then((sequence) => {
            if (!is_last(sequence)) {
                console.log("CONTINUING " + sequence.show.number + " FOR " + sequence.show.identifier);
                var link = (<Attr>xpath("(" + sequence.show.next_xpath + ")/@href", sequence.doc)[0]).value;
                sequence.base_url = url.resolve(sequence.base_url, link);
                sequence.download_this = true;
                sequence.number = sequence.show.number;
                return Promise.delay(50).then(() =>
                    download_sequence(sequence));
            } else {
                console.log("STOPPING " + sequence.show.number + " FOR " + sequence.show.identifier);
                sequence.download_this = false;
                sequence.initial = false;
                return sequence.show;
            }
        });
}

const make_request = function (sequence: Sequence) {
    return new Promise(function (resolve, reject) {
        request({
            url: sequence.base_url,
            method: 'GET',
            gzip: true,
            encoding: "utf-8",
            headers: {
                'User-Agent': "request",
            }
        }, function (error, response, body) {
            if (error) {
                if (error.code && error.code == "ECONNRESET") {
                    if (sequence.restarts < 10) {
                        resolve(Promise.delay(50).then(() =>
                            make_request(sequence)));
                        return;
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
        .then((doc) => sequence.doc = doc)
        .return(sequence);

}

const redownload = function (identifier: string, episode: number) {
    return Database.getInstance()
        .then(db => db.get_show(identifier))
        .then((show) => {
            let sequence = build_sequence(show);
            sequence.number = episode - 1;
            sequence.download_this = true;
            sequence.check_all_episodes = false;
            return show.get_episode_page_url(episode)
                .then((page_url) => {
                    sequence.base_url = page_url
                    return sequence
                })
                .then(make_request)
                .then(download_images);
        })
}

const strip_uri = function (doc) {
    let v = new Set();
    strip_uri_rec(v, doc);
    return doc;
}

const strip_uri_rec = function (v, e) {
    v.add(e);
    if ('namespaceURI' in e) e.namespaceURI = null;
    for (var p in e) {
        if (!v.has(e[p]) &&
            e[p] !== null &&
            typeof(e[p]) == "object") {
            strip_uri_rec(v, e[p]);
        }
    }
}


const extract_body = function (body: string) {
    var document = parse5.parse(body);
    var xhtml = xmlser.serializeToString(document);
    var doc = new dom().parseFromString(xhtml);
    return strip_uri(doc);
}

const is_last = function (sequence: Sequence) {
    var link = <Attr[]> xpath("(" + sequence.show.next_xpath + ")/@href", sequence.doc);
    return link.length == 0 || url.resolve(sequence.base_url, link[0].value) == sequence.base_url;
}

const create_thumbnail = function (data: Episode): Promise<Episode> | Episode {
    if (data.thumbnail_name) {
        return new Promise((r, error) => {
            gm(data.filename)
                .resize(100, 150)
                .write(data.thumbnail_name, (e) => {
                    if (e) error(e);
                    else r(data);
                });
        })
    }
    return data;
}

//Download an image
const download_image = function (data: Episode): Promise<Episode> {
    return new Promise((r, error) => {
        gm(request({
            url: data.url,
            method: 'GET',
            encoding: null,
            headers: {
                'User-Agent': "request",
            }
        }))
            .selectFrame(0)
            .flatten()
            .write(data.filename, (e) => {
                if (e) error(e);
                else r(data);
            });
    }).then(create_thumbnail)
        .catch((e) => {
            console.error(e);
            return data;
        });
}

const extract_aditional = function (episode: Episode, sequence: Sequence, image_index: number): Episode {
    let title = <any[]> xpath("//title/text()", sequence.doc);
    episode.data = {};
    if (title.length > 0) episode.data.title = title[0].data;
    let alt_text = <Attr[]> xpath("(" + sequence.show.image_xpath + ")/@title", sequence.doc);
    if (alt_text.length > image_index) episode.data.alt_text = alt_text[0].value;
    if (sequence.show.text_xpath) {
        let texts = xpath(sequence.show.text_xpath, sequence.doc);
        episode.data.text = texts.map((text) => {
            return xmlser.serializeToString(text, true);
        });
    }

    return episode;

}

const download_images = function (sequence: Sequence): Promise<Sequence> {
    return new Promise((resolve, reject) => {
        var doc = sequence.doc;
        var identifier = sequence.show.identifier;
        if (sequence.download_this) {
            var images: string[] = xpath("(" + sequence.show.image_xpath + ")/@src", doc)
                .map((rel_url: Attr) => url.resolve(sequence.base_url, rel_url.value));
            let index = images.indexOf(sequence.show.last_episode_url)
            if (index > -1) {
                images.splice(index, 1);
            }
            resolve(Promise.filter(images, (img) => {
                return !sequence.check_all_episodes || Database.getInstance().then(db => db.check_image_exists(sequence.show.identifier, img).then(b => !b))
            }).map((image_url: string, index: number, length: number) => {
                return new Promise((resolve) => {
                    let number = sequence.number + index + 1;
                    let filename = path.join(sequence.show.directory, number + ".jpg");
                    let thumbnail_name = path.join(sequence.show.thumbnail_dir, number + ".jpg");
                    let episode: Episode = {
                        url: image_url
                        , filename: filename
                        , thumbnail_name: thumbnail_name
                        , number: number
                        , identifier: sequence.show.identifier
                        , base_url: sequence.base_url
                    }
                    resolve(episode);
                }).then((episode: Episode) => extract_aditional(episode, sequence, index))
                    .then(download_image)
                    .then(sequence.show.insert_new_episode);
            })
                .return(sequence));
        } else {
            resolve(sequence);
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
import {Database, Show} from './../data/config';
