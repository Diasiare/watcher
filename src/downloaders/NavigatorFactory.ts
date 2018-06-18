import { Show } from "../data/Database";
import Navigator from "./Navigator";


class NavigatorFactory {
    public getNavigator(show : Show) : Navigator {
        return null;
    }
}

export default new NavigatorFactory();