import Resource from "./Resource";
import { Page } from "puppeteer";
import * as Promise from 'bluebird';
import Episode from "../types/Episode";


export default interface ResourceExtractor {

    extract(page : Page) : Promise<[Episode, Resource[]][]>
}