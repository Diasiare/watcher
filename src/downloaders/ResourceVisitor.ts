export default interface ResourceVisitor<T> {
    visitImage(url : string) : T;
    visitTile(text : string) : T;
    visitAltText(text : string) : T;
    visitDescription(text : string) : T;
}