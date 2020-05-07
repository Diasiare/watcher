import { Configuration } from "../configuration/Configuration";
import { navigators } from "../downloaders/NavigatorFactory";
import { resourceExtractors } from "../downloaders/ResourceExtractorFactory";

export function resolve_width_int(window_width) {
    return Math.min(window_width, 904) - 4;
}

export function resolve_width(window_width) {
    return resolve_width_int(window_width) + "px";
}

export function is_mobile(window_width) {
    return resolve_width_int(window_width) > (window_width - 50);
}

export function requiredProps(config ?:Configuration.Configuration, includeOptional : boolean = true) : string[] {
    if (!config) return [];
    
    const rw : string[] = []
    const navClass = config.navigationConfiguration.class;
    navigators[navClass].parameters.forEach(p => rw.push(p));
    
    const exts = config.resourceExtractors;
    const extParams = exts.filter(v => includeOptional || !v.optional).map((ext) => resourceExtractors[ext.class].parameters);
    extParams.forEach(ps => ps.forEach(p => rw.push(p)));
    return rw;
}

export function paramToName(param: string): string {
    let words = param.split("_");
    words = words.map((word) => word.substring(0,1).toUpperCase() + word.substring(1));
    return words.join(" ");
}
