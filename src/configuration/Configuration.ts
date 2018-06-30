import {readFile} from "fs";
import * as Promise from "bluebird";

export namespace Configuration {
    export interface Displayname {
        singular: string;
        plural: string;
    }

    export interface NavigationConfiguration {
        class: string;
        mandatory: boolean;
    }

    export interface NavigationConfigurations {
        [key: string]: NavigationConfiguration[];
    }

    export interface ResourceExtractor {
        class: string;
    }

    export interface Configuration {
        displayname: Displayname;
        navigationConfigurations: NavigationConfigurations;
        resourceExtractors: ResourceExtractor[];
        defaults: Defaults;
    }

    export interface ImageExtractor {
        image_xpath: string;
    }

    export interface SequenceNavigator {
        next_xpath: string;
    }

    export interface Preconfigurations {
        [key: string]: Preconfiguration;
    }

    export interface Preconfiguration {
        [key: string]: string;
    }

    export interface Defaults {
        [key: string]: Preconfigurations;
    }

    export interface Configurations {
        [key: string]: Configuration;
    }
}

export function loadConfiguration(path : string) : Promise<Configuration.Configurations> {
    return Promise.promisify(readFile)(path).then((buffer) => JSON.parse(buffer.toString()));

}
 

