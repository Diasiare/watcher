export default interface FrontEndEpisode {
    identifier: string,
    number: number,
    base_url: string,
    src : string,
    img ?: HTMLImageElement,
    data?: {
        title?: string,
        text?: string[],
        alt_text?: string,
    }
}