import Downloader from "./Downloader";
import Resource from "./Resource";


class DownloaderFactory {
    public getDownloader<T extends Resource>(show : T) : Downloader<T> {
        return null;
    }
}

export default new DownloaderFactory();