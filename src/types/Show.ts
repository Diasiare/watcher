import RawShow from './RawShow';

export default interface ShowFields extends RawShow {
    interval: number;
    directory: string;
    thumbnail_dir: string;
    number: number;
    last_episode_url: string;
}