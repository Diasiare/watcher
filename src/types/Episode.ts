export default interface Episode {
    identifier: string,
    number: number,
    url: string,
    base_url: string,
    filename?: string,
    thumbnail_name?: string,
    data?: {
        title?: string,
        text?: string[],
        alt_text?: string,
    }
}