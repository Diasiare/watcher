import * as Promise from 'bluebird';
import * as $ from 'jquery';
import ShowData from '../types/ShowData';
import Show from '../types/Show';
import RawShow from '../types/RawShow';
import Link from './Link';
import FrontEndEpisode from '../types/FrontEndEpisode';

class FrontLink implements Link {
	
	private static doRequest(method : string, settings : any) : Promise<any> {
		settings.method = method;
		return new Promise((resolve, reject) => {
			$.ajax(settings)
				.fail((xhr , status, error) => reject(new Error(method +  " " + settings.url + "  " + error)))
				.done((data) => resolve(data));
		})
	}

	getRelativeEpisode(show : string, episode : number, direction : string) : Promise<FrontEndEpisode> {
		return FrontLink.doRequest("GET" ,{ 
			url :"/data/shows/" + show + "/" + episode + "/" + direction,
			dataType : "json"
		});
		
	}

	getShowsData() : Promise<ShowData[]> {
		return FrontLink.doRequest("GET", { 
			url :"/data/shows/",
			dataType : "json"
		});
	}

	getShowData(identifier : string) : Promise<ShowData> {
		return FrontLink.doRequest("GET", { 
			url :"/data/shows/" + identifier,
			dataType : "json"
		});
	}

	getBackup() : Promise<RawShow[]> {
		return FrontLink.doRequest("GET", { 
			url :'/data/backup.json',
			dataType : "json"
		});
	}

	loadBackup(backup : RawShow[]) : Promise<Show[]>{
		return FrontLink.doRequest("POST", { 
			url :'/data/backup.json',
			data : {backup : backup},
			dataType : "json"
		});
	}

	updateLastRead(identifier : string, episode : number, type : string) : Promise<any>{
		return FrontLink.doRequest("POST", { 
			url :"/data/shows/" + identifier + "/" + episode + "/" + type
		});
	}

	redownload(identifier : string, episode : number) : Promise<any>{
		return FrontLink.doRequest("POST", { 
			url :"/data/shows/" + identifier + "/" + episode
		});
	}

	restartShow(identifier : string, episode : number , new_url : string, nextxpath: string , imxpath : string, textxpath : string) : Promise<any> {
		return FrontLink.doRequest("POST", {
			url : "/data/shows/" + identifier,
			data : {
				episode: episode,
            	new_url: new_url,
            	imxpath: imxpath,
            	nextxpath: nextxpath,
           	    textxpath: textxpath,
			}
		});
	}

	newShow(showData : RawShow) : Promise<Show>{
		return FrontLink.doRequest("POST", { 
			url :'/data/shows',
			data : showData,
			dataType : "json"
		});
	}

	getWebPage(url : string) : Promise<string>{
		return FrontLink.doRequest("GET", { 
			url : "/function/get",
			data : {url: url}
		});
	}

	deleteShow(identifier : string) : Promise<any>{
		return FrontLink.doRequest("DELETE", { 
			url : "/data/shows/" + identifier
		});
	}
}

const link : Link = new FrontLink() 
export default link as Link;