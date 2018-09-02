import Resource from "./Resource";
import * as Promise from 'bluebird';
import Episode from "../types/Episode";
import { Browser } from "./Browser";


export default interface ResourceExtractor {

    extract(browser : Browser) : Promise<[Episode, Resource[]][]>
}