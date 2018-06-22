import ResourceType from "./ResourceType";
import ResourceVisitor from "./ResourceVisitor";

export default class Resource {
    resourceType : ResourceType;
    data : any;

    private constructor(resourceType : ResourceType, data : any) {
        this.resourceType = resourceType;
        this.data = data;
    }

    public static image(url : String) : Resource {
        return new Resource(ResourceType.IMAGE, url);
    }

    public static title(title : string) {
        return new Resource(ResourceType.TITLE, title);
    }

    public static altText(text : string) {
        return new Resource(ResourceType.ALT_TEXT, text);
    }

    public static description(text : string) {
        return new Resource(ResourceType.DESCRIPTION, text);
    }

    public accept<T>(visitor : ResourceVisitor<T>) : T {
        switch (this.resourceType) {
            case ResourceType.IMAGE: return visitor.visitImage(this.data);
            case ResourceType.TITLE: return visitor.visitTile(this.data);
            case ResourceType.ALT_TEXT : return visitor.visitAltText(this.data);
            case ResourceType.DESCRIPTION : return visitor.visitDescription(this.data);
            default: throw Error("Resource type does not exist");
        }
    }
}