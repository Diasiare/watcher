export default interface RawShow {
    identifier: string;
    name: string;
    type: string;
    logo?: string;
    base_url: string;
    next_xpath: string;
    image_xpath: string;
    text_xpath: string;
    requireJS?: boolean;
}