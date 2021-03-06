import {readFile} from "fs";
import * as Promise from "bluebird";
import {IContract, objOf, str, bool, arrOf, arr, num, optional, obj} from "ts-dynamic-type-checker";
const debug = require('debug')('watcher-configuration');

const numIndex = <T extends {[key : number] : any}>(x : T) : T => {
    Object.entries(x).forEach(([k, v])  => {
        if (isNaN(parseInt(k))) throw TypeError("Key " + k + " is not numeric");
    });
    return x;
}

const strIndex = <T extends {[key : number] : any}>(x : T) : T => {
    obj(x);
    return x;
}


function strIndexOf<K>(base : IContract<K>) : IContract<{[key : string] : K}> {
    return <T extends {[key : string] : K}>(x : T) : T => {
        strIndex(x);
        Object.values(x).forEach(v => base(v));
        return x;
    } 
}


function numIndexOf<K>(base : IContract<K>) : IContract<{[key : number] : K}> {
    return <T extends {[key : string] : K}>(x : T) : T => {
        numIndex(x);
        Object.values(x).forEach(v => base(v));
        return x;
    } 
}


export namespace Configuration {
    export interface Displayname {
        singular: string;
        plural: string;
    }

    const DisplaynameContract : IContract<Displayname> = objOf({
        singular : str,
        plural : str
    });

    export interface NavigationConfiguration {
        class: string;
        optional?: boolean;
    }

    const NavigationConfigurationContract : IContract<NavigationConfiguration>= objOf({
        class : str,
        optional : optional(bool)
    });

    export interface ResourceExtractor {
        class: string;
        optional ?: boolean;
    }

    const ResourceExtractorContract : IContract<ResourceExtractor> = objOf({
        class : str,
        optional : optional(bool)
    });

    export interface Preconfiguration {
        [key: string]: string;
    }

    const PreconfigurationContract : IContract<Preconfiguration> = strIndexOf(str);

    export interface Preconfigurations {
        [key: string]: Preconfiguration;
    }

    const PreconfigurationsContract : IContract<Preconfigurations> = strIndexOf(PreconfigurationContract);

    export interface Defaults {
        [key: string]: Preconfigurations;
    }

    const DefaultsContract : IContract<Defaults> = strIndexOf(PreconfigurationsContract);

    export interface Cookie {
        name: string;
        value: string;
        domain: string;
    }

    const CookieContract : IContract<Cookie> = objOf({
        name: str,
        value: str,
        domain: str,
    });

    export interface Configuration {
        displayname: Displayname;
        navigationConfiguration: NavigationConfiguration;
        resourceExtractors: ResourceExtractor[];
        defaults ?: Defaults;
        cookies ?: Cookie[];
    }

    const ConfigurationContract : IContract<Configuration> = objOf({
        displayname : DisplaynameContract,
        navigationConfiguration : NavigationConfigurationContract,
        resourceExtractors : arrOf(ResourceExtractorContract),
        defaults : optional(DefaultsContract),
        cookies: optional(arrOf(CookieContract))
    });

    export interface Configurations {
        [key: string]: Configuration;
    }

    export const ConfigurationsContract : IContract<Configurations> = strIndexOf(ConfigurationContract); 
}

export function loadConfiguration(path : string) : Promise<Configuration.Configurations> {
    debug("loading configuration at ", path)
    return Promise.promisify(readFile)(path).then((buffer) => JSON.parse(buffer.toString()))
        .then(Configuration.ConfigurationsContract);
}
