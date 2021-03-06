import * as React from 'react';
import * as ReactDOM from'react-dom';
import {BrowserRouter as Router, Route, Switch, RouteComponentProps} from'react-router-dom';
import *  as injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();
require("./../css/index.css");
import {ImageDisplay} from "./front-end/ImageDisplay";
import {ShowList} from "./front-end/ShowList";
import {ShowPage} from "./front-end/ShowPage";
import navigate from "./front-end/Navigator";
import {is_mobile} from "./front-end/helpers";
import {Menu} from "./front-end/Menu";
import {ShowAdder} from "./front-end/ShowAdder";
import show_loader from "./front-end/ShowDataCache";
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import {
  cyan500, cyan700,
  pinkA200,
  grey100, grey300, grey400, grey500,
  white, darkBlack, fullBlack,
} from 'material-ui/styles/colors';
import {fade} from 'material-ui/utils/colorManipulator';
import spacing from 'material-ui/styles/spacing';
import { withRouter } from 'react-router-dom';


show_loader.registerAllShowsCallback("Title", (shows) => {
  if (shows) {
    let title = "Watcher";
    let new_episodes = shows.filter((show) => show.episode_count > show.new && show.new > 0).length;
    if (new_episodes != 0) {
      title += " (" + new_episodes + ")";
    }
    if (document.title != title) {
      document.title = title;
    }
  }
});


declare var Notification: any;

//Just saving this here so that we can override things later
const theme = getMuiTheme({spacing: spacing,
  fontFamily: 'Roboto, sans-serif',
  palette: {
    primary1Color: cyan500,
    primary2Color: cyan700,
    primary3Color: grey400,
    accent1Color: pinkA200,
    accent2Color: grey100,
    accent3Color: grey500,
    textColor: darkBlack,
    alternateTextColor: white,
    canvasColor: white,
    borderColor: grey300,
    disabledColor: fade(darkBlack, 0.3),
    pickerHeaderColor: cyan500,
    clockCircleColor: fade(darkBlack, 0.07),
    shadowColor: fullBlack,
  },
});

class Main extends React.Component<RouteComponentProps<{}>>{

  state : {
    width: number,
    height : number,
  }

  constructor(props){
    super(props);
    this.path_change = this.path_change.bind(this);
    this.state = { width: 0, height: 0 };
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
  }

  componentWillMount() {
    this.props.history.listen(this.path_change)
    this.path_change(this.props.location);
    navigate.init(this.props.history.push);
    window.addEventListener('resize', this.updateWindowDimensions);
  }
  
  componentDidMount() {
    this.updateWindowDimensions();
  }

  path_change(location) {
    let parts = location.pathname.split("/");
  }

  updateWindowDimensions() {
    this.setState({ width: document.body.clientWidth, height: window.innerHeight });
  }

    render() {
        let width = this.state.width;
        let style= {
            width: (this.state.width-100)+"px",
            fontFamily: "Roboto",
            margin:"auto",
        }
        if (is_mobile(width)) {
            style.width="100%";
        }


        return <div style={style}>
                <Menu width={width}/>
                <Switch>
                    <Route path="/read/:show/:type" render={({match})=>{
                     return <ImageDisplay width={width} 
                        show={match.params.show} 
                        type={match.params.type}/>
                    }}/>
                    <Route path="/read/:show" render={({match})=>{
                     return <ShowPage width={width} show={match.params.show} key={match.params.show}/>
                    }}/>
                    <Route path="/list/:filter" render={({match})=>{
                      return <ShowList width={width} filter={match.params.filter} key={match.params.filter}/>
                    }}/>
                    <Route path="/list/" render={()=>{
                      return <ShowList key="none" width={width}/>
                    }}/>
                    <Route path="/new" render={({history})=> <ShowAdder width={width}/>}/>
              </Switch>
        </div>
  }
}

const RouterMain = withRouter(Main);

ReactDOM.render(
  <MuiThemeProvider muiTheme={theme}>
    <Router>
      <RouterMain/>
    </Router>
  </MuiThemeProvider>,
  document.getElementById('root')
);


if (Notification.permission === "default") {
  Notification.requestPermission();
}