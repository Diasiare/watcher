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
const Menu = require("./front-end/Menu");
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

ReactDOM.render(
  <MuiThemeProvider muiTheme={theme}>
  	<Router><div className="contents">
  	  <Menu/>
  		<Switch>
  		  <Route path="/read/:show/:episode/:type" render={({match,history})=>{
  			return <ImageDisplay show={match.params.show} episode={match.params.episode} type={match.params.type} history={history}/>
  			}}/>
  		  <Route path="/list/:type" render={({match})=> <ShowList list={match.params.type}/>}/>
  		</Switch>
  	</div></Router>
  </MuiThemeProvider>,
  document.getElementById('root')
);