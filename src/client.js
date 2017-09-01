import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();
const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const ReactRouter = require('react-router');
const {BrowserRouter:Router,Route,Switch} = require('react-router-dom');
require("./css/index.css");
const ImageDisplay = require("./front-end/ImageDisplay");
const ShowList = require("./front-end/ShowList");
const ShowPage = require("./front-end/ShowPage");
const navigate = require("./front-end/navigate");
const {is_mobile} = require("./front-end/helpers");
const Menu = require("./front-end/Menu");
const ShowAdder = require("./front-end/ShowAdder");
const loader = require("./front-end/image-preloader");
const show_loader = require("./front-end/show-data-loader");
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

class Main extends React.Component {
  constructor(props){
    super(props);
    this.path_change = this.path_change.bind(this);
    this.state = { width: '0', height: '0' };
    this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
  }

  componentWillMount() {
    this.props.history.listen(this.path_change)
    this.path_change(this.props.location);
    navigate.init(this.props.history.push);
    show_loader.preload_data();
    window.addEventListener('resize', this.updateWindowDimensions);
  }
  
  componentDidMount() {
    this.updateWindowDimensions();
  }

  path_change(location) {
    let parts = location.pathname.split("/");
    parts.splice(0,1);
    if (parts.length == 4 && parts[0] == "read") {
      loader.change_episode(parts[1],parts[2]); 
    }
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
                    <Route path="/read/:show/:episode/:type" render={({match})=>{
                     return <ImageDisplay width={width} 
                        show={match.params.show} 
                        episode={match.params.episode} 
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
                    <Route path="/new" render={({history})=> <ShowAdder history={history} width={width}/>}/>
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