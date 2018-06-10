var navf = null;

export function init(f) {
    navf = f;
}

export function navigate(location) {
    navf(location);
}