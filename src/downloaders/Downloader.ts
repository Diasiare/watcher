import Resource from "./Resource";
import Episode from "../types/Episode";
import * as Promise from 'bluebird';

export default interface Downloader<T extends Resource> {
    
    download() : Promise<(episode : Episode) => Episode>;
}