export default interface FrontEndEpisode {
    identifier: string,
    number: number,
    original_url: string,
    base_url: string,
    src : string,
    img ?: HTMLImageElement,
    data?: {
        title?: string,
        text?: string[],
        alt_text?: string,
    }
}