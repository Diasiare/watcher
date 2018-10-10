import * as Promise from 'bluebird';

export class LimitedResourceAllocator<T, P> {

    private activeCount : number = 0;
    private maxCount : number;
    private creator : (parent : P) => Promise<T>
    private deCreator : (child : T) => Promise<void>;
    private initializer : () => Promise<P>;
    private deInitializer : (parent : P) => Promise<void>;
    private parent : Promise<P> = null;
    private queue : ((p : Promise<T>) => void)[] = [];


    public constructor(
        maxCount : number, 
        creator : (parent : P) => Promise<T>, 
        deCreator : (child : T) => Promise<void>, 
        initializer : () => Promise<P>, 
        deInitializer : (parent : P) => Promise<void>
    ) {
        this.maxCount = maxCount;
        this.creator = creator;
        this.deCreator = deCreator;
        this.initializer = initializer;
        this.deInitializer = deInitializer;
    }

    public allocate() : Promise<T> {
    if (!this.parent) {
        this.parent = this.initializer();
    } 

    if (this.activeCount >= this.maxCount) {
        return new Promise((resolve) =>{
            this.queue.push(resolve);
        })
    } else {
        this.activeCount++;
        return this.parent.then(this.creator);
    }
}

    public dealocate(child : T) : Promise<void> {    
    if (this.activeCount <= 1 && this.parent) {
        this.activeCount--;
        let tmpParent = this.parent;
        this.parent = null;
        return tmpParent.then(this.deInitializer);
    } else if (this.queue.length > 0){
        this.queue.shift()(this.parent.then(this.creator));
        return Promise.resolve(this.deCreator(child));
    } else {
        this.activeCount--;
        return Promise.resolve(this.deCreator(child));
    }
}
} 