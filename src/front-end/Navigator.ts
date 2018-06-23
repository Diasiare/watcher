export class Navigator {
        private navigateFunction : (url : string) => void;
        private change_callback : (url : string) => void;
    
        constructor(navigateFunction ?: (url : string) => void, change_callback ?: (url : string) => void) {
            this.navigateFunction = navigateFunction;
            this.change_callback = change_callback;
        }
    
        
        public decorate(change_callback : (url : string) => void) : Navigator {
            return new Navigator(this.navigateFunction, change_callback);
        }
    
        private preNav(url : string) {
            if (this.change_callback) {
                this.change_callback(url);
            }
        }
    
        private navigate(url : string) : void {
            this.preNav(url);
            this.navigateFunction(url);
        }
    
        public init(navigateFunction : (url : string) => void) : void {
            this.navigateFunction = navigateFunction;
        }
    
        public read(identifier : string, mode : string) {
            this.navigate("/read/" + identifier + "/" + mode);
        }

        public list(filter ?: string) {
            if(filter) {
                this.navigate("/list/" + filter);
            } else {
                this.navigate("/list")
            }
        }

        public newShow() {
            this.navigate("/new");
        }

        public showPage(identifier : string) {
            this.navigate("/read/" + identifier)
        }
    
    }


const  navigator = new Navigator();

export default navigator;