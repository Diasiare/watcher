import * as Promise from 'bluebird';
import ShowData from '../types/ShowData';
import Show from '../types/Show';
import RawShow from '../types/RawShow';
import Link from './Link';

class FrontLink implements Link {
	
	getRelativeEpisode(show : string, episode : number, direction : string) : Promise<any> ;

	getShowsData() : Promise<ShowData[]>;

	getShowData(identifier : string) : Promise<ShowData> ;

	getBackup() : Promise<RawShow[]> ;

	loadBackup(backup : RawShow[]) : Promise<Show[]>;

	updateLastRead(identifier : string, episode : number, type : string) : Promise<any>;

	redownload(identifier : string, episode : number) : Promise<any>;

	restartShow(identifier : string, episode : number , new_url : string, nextxpath: string , imxpath : string, textxpath : string) : Promise<any> ;

	newShow(showData : RawShow) : Promise<Show>;

	getWebPage(url : string) : Promise<string>;

	deleteShow(identifier : string) : Promise<any>;
}

const link : Link = new FrontLink() 
export default link as Link;