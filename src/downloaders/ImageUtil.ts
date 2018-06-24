import * as magick from 'gm';
const gm : any = magick.subClass({imageMagick: true});
import * as request from 'request';
import * as path from 'path';
import * as Promise from "bluebird";
const debug = require('debug')('watcher-image-utils');


export function downloadImage(url : string, targetFolder : string, name : string) : Promise<any> {
    return new Promise((r, error) => {
        let filename = path.join(targetFolder, name + ".jpg");
        let image;
        if (url.startsWith("data:")) {
                let [prelim, raw] = url.split(',');
                image = gm(Buffer.from(raw, 'base64'));
        } else {
            image = gm(request({
                url: url,
                method: 'GET',
                encoding: null,
                headers: {
                    'User-Agent': "request",
                }
            }))
        }

        image.selectFrame(0)
            .flatten()
            .write(filename, (e) => {
                if (e) error(e);
                else r(filename);
            });
    }).catch(error => {
        debug("Failed to download ", url, "to ", name, " due to " , error);
        throw error;
    });
}