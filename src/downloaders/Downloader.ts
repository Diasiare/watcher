import Resource from "./Resource";
import Episode from "../types/Episode";
import * as Promise from 'bluebird';
import { Show } from "../data/Database";


export default interface Downloader {
    
    download(episode : Episode, show : Show) : Promise<Episode>;
}