import {RawShow} from './RawShow';

export interface Show extends RawShow {
    interval: number;
    directory: string;
    thumbnail_dir: string;
    number: number;
    last_episode_url : string;
}