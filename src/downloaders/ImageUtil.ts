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
        if (url.startsWith("data:")) {
                let [prelim, raw] = url.split(',');
                image = gm(Buffer.from(raw, 'base64'));
        } else {
            let headers = {
                'User-Agent': "request",
            };
            if (referer) {
                headers["Referer"] = referer;
            }

            image = gm(request({
                url: url,
                method: 'GET',
                encoding: null,
                headers,
            }).on('error', (error => {
                debug("Problem downloading image", error)
                reject(error)
            })));
        }

        image.selectFrame(0)
            .flatten()
            .write(filename, (e) => {
                if (e) {
                    debug("Problem writing image", e);
                    reject(e);
                }
                else r(filename);
            });
    }).catch(error => {
        debug("Failed to download ", url, "to ", name, " due to " , error);
        if (retries > 0) {
            debug("Retrying image download")
            return Promise.delay(100).then(() => downloadImage(url, targetFolder, name , retries - 1));
        }
        throw error;
    });
}