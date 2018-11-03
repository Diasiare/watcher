

import * as sqlite from 'sqlite';
import * as Nedb from 'nedb';
import RawShow from './types/RawShow';

interface DBShow {
    identifier : string,
    type : "show",
    data : RawShow
    new : number,
    reread : number
}

interface DBEpisodeData {
    image_url ?: string,
    image_location ?: string,
    title ?: string,
    alt_text ?: string,
    text ?: string[] 
}

interface DBEpisode {
    type : "episode",
    show : string,
    number : number,
    url ?: string,
    data : {
        image_url ?: string,
        image_location ?: string,
        title ?: string,
        alt_text ?: string,
        text ?: string[] 
    }
}

const model = {
    shows: `identifier TEXT NOT NULL PRIMARY KEY,
    data TEXT
    `,
    episodes: `show TEXT NOT NULL REFERENCES shows(identifier) ON DELETE CASCADE,
    number INT NOT NULL,
    image_url TEXT NOT NULL,
    page_url TEXT NOT NULL,
    aditional_data TEXT,
    CONSTRAINT episodes_pkey PRIMARY KEY (show,number) ON CONFLICT REPLACE
    `,
    last_read: `show TEXT NOT NULL REFERENCES shows(identifier) ON DELETE CASCADE,
    type TEXT NOT NULL,
    number INT NOT NULL,
    CONSTRAINT unread_pkey PRIMARY KEY(show,type) ON CONFLICT REPLACE
    `
}

let toDb = new Nedb({ filename: "database.nedb", autoload: true });
console.log("Starting")
sqlite.open("database.sqlite").then(async db => {
    let shows = await db.all("SELECT * FROM shows");
    let episodes = await db.all("SELECT * FROM episodes")
    let last_reads : any[] = await db.all("SELECT * FROM last_read")

    for (let i = 0; i < shows.length; i++) {
        const show = shows[i];
        let lr = last_reads.filter(f => f.show == show.identifier);
        console.log("LR is", lr)
        let n = null;
        let reread = null;

        lr.forEach(l => {
            if (l.type == "new") {
                n = l.number;
            } else {
                reread = l.number;
            }
        });

        let nshow : DBShow = {
            identifier : show.identifier,
            type : "show",
            data : JSON.parse(show.data),
            new : n,
            reread : reread,
        }
        
        toDb.insert(nshow);
    }

    for (let i2 = 0; i2 < episodes.length; i2++) {
        const episode = episodes[i2];
        
        let stuff = JSON.parse(episode.aditional_data);


        let nEp : DBEpisode = {
            type : "episode",
            show : episode.show,
            number : episode.number,
            url : episode.page_url,
            data : {
                image_url : episode.image_url
            }
        }

        if (stuff.title) {
            nEp.data.title = stuff.title;
        }
        if (stuff.alt_text) {
            nEp.data.alt_text = stuff.alt_text;
        }
        if (stuff.text) {
            nEp.data.text = stuff.text;
        }

        toDb.insert(nEp);
    }

})