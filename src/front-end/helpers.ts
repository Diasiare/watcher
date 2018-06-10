export function resolve_width_int(window_width) {
    return Math.min(window_width, 904) - 4;
}

export function resolve_width(window_width) {
    return resolve_width_int(window_width) + "px";
}

export function is_mobile(window_width) {
    return resolve_width_int(window_width) > (window_width - 50);
}

