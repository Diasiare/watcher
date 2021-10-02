import * as magick from 'gm';
const gm : any = magick.subClass({imageMagick: true});
import * as request from 'request';
import * as path from 'path';
import * as Promise from "bluebird";
const debug = require('debug')('watcher-image-utils');


export function downloadImage(url : string, targetFolder : string, name : string, retries : number, referer ?: string) : Promise<any> {
    debug("Downloading", url, "to", targetFolder, "with name", name, "retries left", retries);
    return new Promise((r, reject) => {
        let filename = path.join(targetFolder, name + ".jpg");
        let image;
        let failed = false;
        if (url.startsWith("data:")) {
                let [prelim, raw] = url.split(',');
                image = gm(Buffer.from(raw, 'base64'));
                r(saveImage(image, filename));
        } else {
            let headers = {
                'User-Agent': "request",
            };
            if (referer) {
                headers["Referer"] = referer;
            }

            request({
                url: url,
                method: 'GET',
                encoding: null,
                headers,
            }, (error, response, buff) => {
                debug("Image download response", response.statusCode, error);
                if (!error && response.statusCode < 400) {
                    r(saveImage(gm(buff), filename));
                } else {
                    debug("Problem downloading image", url, response.statusCode, response.statusMessage, error);
                    reject(new Error(`Problem downloading image, ${url}, ${response.statusCode}`, {cause : error}));
                }
            });
        }
    }).catch(error => {
        debug("Failed to download ", url, "to ", name, " due to " , error);
        if (retries > 0) {
            debug("Retrying image download")
            return Promise.delay(100).then(() => downloadImage(url, targetFolder, name , retries - 1));
        }
        throw error;
    });
}

function saveImage(image: any, filename): Promise<any> {
   return new Promise((r, reject) => { 
    image.selectFrame(0)
        .flatten()
        .write(filename, (e) => {
            if (e) {
                debug("Problem writing image", e);
                reject(e);
            }
            else r(filename);
        });
    });
}