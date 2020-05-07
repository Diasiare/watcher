import ShowParameters from "./ShowParameters";

export default interface RawShow extends ShowParameters {
    identifier: string;
    name: string;
    type: string;
    logo?: string;
    base_url: string;
    requireJS?: boolean;
    navigator_configuration?: string;
}