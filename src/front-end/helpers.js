function resolve_width_int(window_width) {
    return Math.min(window_width, 904) - 4;
}

function resolve_width(window_width) {
    return resolve_width_int(window_width) + "px";
}

function is_mobile(window_width) {
    return resolve_width_int(window_width) > (window_width - 50);
}

module.exports = {
    resolve_width: resolve_width,
    resolve_width_int: resolve_width_int,
    is_mobile: is_mobile
}

