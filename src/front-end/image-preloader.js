const $ = require('jquery');


var preloads = {next:null,
                prev:null,
                last:null,
                first:null,
                current:null,
                current_show:null,
                callbacks : new Map()
            }


function update(type,identifier,number) {
    if (preloads[type]===false) return;
    preloads[type] = false;
    $.get("/data/shows/" + identifier + "/" + number + "/" + type, null , 
        function(data){
            if (preloads.current_show == identifier) {
                data.img = new Image();
                data.img.src = data.src;
                preloads[type] = data;
                perform_callbacks([type]);  
            }
        },
        "json");
}

function get_data(type) {
    return preloads[type];
}

function perform_callbacks(types) {
    for (let key of preloads.callbacks.keys()) {
        perform_callback(types,key)
    }
}

function perform_callback(types,o) {
    let obj = preloads.callbacks.get(o);
    let update = {};
    types.forEach((type)=>{
        if (type in obj) {
            update[obj[type]] = preloads[type];
        }
    });
    if (!($.isEmptyObject(update))) o.setState(update); 
}

function register_callback(type,o,state) {
    if (!preloads.callbacks.has(o)) preloads.callbacks.set(o,{});
    let obj = preloads.callbacks.get(o);
    obj[type] = state;
    if (preloads[type]) {
        perform_callback([type],o);
    }
}

function remove_callback(type,o) {
    let obj = preloads.callbacks.get(o) 
    delete obj[type];
    if ($.isEmptyObject(obj)) preloads.callbacks.delete(o);

}

function change_episode(show,episode) {
    if (show === preloads.current_show) {
        let types = ["current", "next" , "prev" , "first" , "last"];
        for (let i = 0; i < types.length ; i++) {
            let loaded = types[i];
            if (preloads[loaded] && preloads[loaded].number==episode) {
            if (loaded === "next") {
                preloads.prev = preloads.current;
                preloads.current = preloads.next;
                update(loaded,show,episode);
            } else if (loaded === "prev") {
                preloads.next = preloads.current;
                preloads.current = preloads.prev;
                update(loaded,show,episode);
            } else if (loaded === "first" || loaded === "last") {
                preloads.current = preloads[loaded];
                update("next",show,episode);
                update("prev",show,episode);
            }
            perform_callbacks(["prev","next","current"]);
            return;
        }}
    }

    if (show !== preloads.current_show) {
        preloads.current_show = show;
        update("last",show,episode);
        update("first",show,episode);   
        update("current",show,episode);
        update("next",show,episode);
        update("prev",show,episode);
        perform_callbacks(["prev","next","current","first","last"]);
    } else {
        update("current",show,episode);
        update("next",show,episode);
        update("prev",show,episode);
        perform_callbacks(["prev","next","current"]);
    }
}


module.exports = {
    register_callback : register_callback,
    change_episode : change_episode,
    remove_callback : remove_callback,
    get_data : get_data
}