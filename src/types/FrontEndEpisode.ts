export interface FrontEndEpisode {
    identifier: string,
    number: number,
    original_url: string,
    base_url: string,
    src : string,
    data?: {
        title?: string,
        text?: string[],
        alt_text?: string,
    }
}