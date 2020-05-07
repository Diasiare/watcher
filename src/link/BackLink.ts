import Link from './Link';
import {Database, Show} from '../data/Database' ;
import FrontEndEpisode from '../types/FrontEndEpisode';
import RawShow from '../types/RawShow'
import * as Promise from 'bluebird';
import * as request from 'request' ;
import { Configuration } from '../configuration/Configuration';
import ShowParameters from '../types/ShowParameters';
const debug = require('debug')('watcher-back-link')


class BackLink implements Link {
	
	static build_resource_url = function (...parts: string[]): string {
		let adress = ""
		if (parts.length >= 1) adress = adress + "/shows/" + parts[0];
		if (parts.length >= 2) adress = adress + "/" + parts[1];
		return adress;
	}

	getRelativeEpisode(show : string, episode : number, direction : string) : Promise<FrontEndEpisode> {
		let p : Promise<any> = Database.getInstance().then(db => db.get_show(show))

		if (direction === "last") p = p.then(s => s.get_last());
		else if (direction === "first") p = p.then(s => s.get_first());
		else if (direction === "next") p = p.then(s => s.get_next(episode));
		else if (direction === "prev") p = p.then(s => s.get_prev(episode));
		else if (direction === "current") p = p.then(s => s.get_episode_data(episode));


		return p.catch(() => undefined).then((data) => {
			if (data) {
				data.src = BackLink.build_resource_url(show, data.number + ".jpg");
				return data;
			} else {
				return data;
			}
		});
	}

	getShowsData() {
		return Database.getInstance().then(db => db.get_shows())
		.map((show: Show) => {
			return show.get_show_data().then((data) => {
				if (data.logo) {
					data.logo = BackLink.build_resource_url(data.identifier, "logo.jpg");
				}
				return data;
			})
		})
	}

	getShowData(identifier : string) {
		return Database.getInstance().then(db => db.get_show(identifier))
		.then((show) => show.get_show_data())
		.then((data) => {
			if (data.logo) {
				data.logo = BackLink.build_resource_url(data.identifier, "logo.jpg");
			}
			return data;
		});
	}

	getBackup() {
        return Database.getInstance().then(db => db.get_pure_shows());
	}

	loadBackup(backup : RawShow[]) {
		debug("Loading Backup", backup);
		return Promise.resolve(backup)
				.map((show : RawShow) => Database.getInstance().then(db => db.add_new_show(show)));
	}

	updateLastRead(identifier : string, episode : number, type : string) : Promise<any> {
		return Database.getInstance().then(db => db.get_show(identifier))
                    .then(show => show.update_last_read(episode, type));
	}

	redownload(identifier : string, episode : number) {
		return Promise.reject(new Error("Redownload currently not supported"));
	}

	restartShow(identifier : string, episode : number , new_url : string, params: ShowParameters) : Promise<any> {
		return Database.getInstance().then(db => db.get_show(identifier))
                        .then(show => show.restart_from(episode, new_url, params));
	}

	newShow(showData : RawShow) : Promise<Show> {
		return Database.getInstance().then(db => db.add_new_show(showData));
	}

	getWebPage(url : string) : Promise<string> {
		return new Promise((resolve, reject) =>{
			    request({
                    url: url,
                    encoding: "utf-8",
                    method: 'GET',
                    headers: {
                        'User-Agent': "request",
                    },
                    gzip: true
                }, function (error, response, body) {
                    if (error) {
                    	reject(new Error("Could not get data from " + url));
                    } else {
                    	resolve(body);
                    }      
                })
		})
	}

	deleteShow(identifier : string) : Promise<any> {
		return Database.getInstance().then(db => db.get_show(identifier))
                    .then(show => show.delete_show());
	}

	deleteEpisode(identifier : string, episode : number) : Promise<void> {
		return Database.getInstance().then(db => db.get_show(identifier))
            .then(show => show.deleteEpiosde(episode));
	}

	getConfigurations() : Promise<Configuration.Configurations> {
		return Database.getInstance().then((db) => db.getConfigurations());
	}
}

const link : Link = new BackLink() 
export default link as Link;