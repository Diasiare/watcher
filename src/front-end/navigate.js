

var navf = null;

function init(f) {
    navf = f;
}

function navigate(location) {
    navf(location);
}

module.exports = {
    init:init,
    navigate:navigate,
    default:navigate
}