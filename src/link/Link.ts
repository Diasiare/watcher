import * as Promise from 'bluebird';
import ShowData from '../types/ShowData';
import Show from '../types/Show';
import RawShow from '../types/RawShow';
import FrontEndEpisode from '../types/FrontEndEpisode';
import { Configuration } from '../configuration/Configuration';
import ShowParameters from '../types/ShowParameters';

export default interface Link {

	getRelativeEpisode(show : string, episode : number, direction : string) : Promise<FrontEndEpisode> ;

	getShowsData() : Promise<ShowData[]>;

	getShowData(identifier : string) : Promise<ShowData> ;

	getBackup() : Promise<RawShow[]> ;

	loadBackup(backup : RawShow[]) : Promise<Show[]>;

	updateLastRead(identifier : string, episode : number, type : string) : Promise<any>;

	redownload(identifier : string, episode : number) : Promise<any>;

	restartShow(identifier : string, episode : number , new_url : string, params: ShowParameters) : Promise<any> ;

	newShow(showData : RawShow) : Promise<Show>;

	getWebPage(url : string) : Promise<string>;

	deleteShow(identifier : string) : Promise<any>;

	deleteEpisode(identifier : string, episode : number) : Promise<void>;

	getConfigurations() : Promise<Configuration.Configurations>;
}