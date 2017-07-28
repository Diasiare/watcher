const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const ReactRouter = require('react-router');
const {BrowserRouter:Router,Route,Switch} = require('react-router-dom');
require("./css/index.css");
const ImageDisplay = require("./front-end/ImageDisplay")

function MenuBar (props) {
	var categories = ["new","webcomics","anime"];
	return <div className="menubar">{categories.map((name)=>
		<MenuItem name={name} key={name}/>
	)}</div>;
}


function MenuItem (props) {
	return <div className="menuItem">
				<div className="vAlign">{props.name.charAt(0).toUpperCase() 
					+ props.name.slice(1)}</div>
			</div>;
}

ReactDOM.render(

  <Router><div className="contents">
  	<MenuBar/>
  	<Switch>
  	<Route path="/read/:show/:episode/:type" render={({match,history})=>{
  	return <ImageDisplay show={match.params.show} episode={match.params.episode} type={match.params.type} history={history}/>
  	}
  }></Route>
  </Switch>
  </div></Router>,
  document.getElementById('root')
);