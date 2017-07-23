'use strict';

const Router = ReactRouterDOM.HashRouter;
const Route = ReactRouterDOM.Route;

var current_read_type = "reread";

function updateLastRead(show,number) {
	$.post("/data/shows/" + show + "/" + number + "/" + current_read_type);
}

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



class ImageDisplay extends React.Component {
	constructor(props) {
		super(props);
		this.state = {current: {src:"/images/loading.gif",
								number:1,
								identifier:"",
								img : new Image(),
								data : undefined},
			next : null,
			prev : null,
			last : null,
			first : null}
		this.state.current.img.src=this.state.current.src;
		this.on_request = this.on_request.bind(this);
		this.update = this.update.bind(this);
		this.on_key = this.on_key.bind(this);
	}

	on_request(type) {
		console.log(this.state[type]);
		this.setState({current:this.state[type]},()=>{
			updateLastRead(this.state.current.identifier,this.state.current.number);
			this.update("next",this.state.current);
			this.update("prev",this.state.current);
		});
	}

	on_key(e) {
		console.log("press");
		if (e.keyCode === 39) {
			this.on_request("next");
		} else if (e.keyCode == 37) {
			this.on_request("prev");
		}

	}

	componentDidMount() {
		this.update("current",{identifier:"ggar",number:3});
		this.update("next",{identifier:"ggar",number:3});
		this.update("prev",{identifier:"ggar",number:3});
		this.update("last",{identifier:"ggar",number:3});
		this.update("first",{identifier:"ggar",number:3});
		$(document).on("keydown",this.on_key);
	}

	componentWillUnmount() {
		$(document).off("keydown",this.on_key);	
	}

	update(type,episode) {
		var obj = this;
		$.get("/data/shows/" + episode.identifier + "/" + episode.number + "/" + type, null , 
			function(data){
				data.img = new Image();
				data.img.src = data.src;
				var tmp = {};
				tmp[type] = data;
				obj.setState(tmp);
			},
			"json");
	}		
	

	render () {
		return <div className="imageDisplay">
			<ImageContainer episode={this.state.current} click={this.on_request}/>
			<NavElements request={this.on_request}/>
		</div>
	}
}

function NavElements(props) {
	return <div className="imageNav">
			<NavButton direction="back" image_src="images/double_arrow.jpg" type="first" click={props.request}/>
			<NavButton direction="back" image_src="images/single_arrow.jpg" type="prev" click={props.request}/>
			<NavButton direction="forward" image_src="images/single_arrow.jpg" type="next" click={props.request}/>
			<NavButton direction="forward" image_src="images/double_arrow.jpg" type="last" click={props.request}/>
		</div>
}

class NavButton extends React.Component {
	constructor(props) {
		super(props);
		this.on_click = this.on_click.bind(this);
	}

	on_click(e) {
		e.preventDefault();
		this.props.click(this.props.type);
	}

	render() {
		var image_class = "navImage";
		if (this.props.direction ==="back") {
			image_class += " flipped"
		}
		return <div className="navButton"><img className={image_class} src={this.props.image_src} onClick={this.on_click}/></div>	
	}
}

function ImageContainer(props) {
	return <div className="imageContainer">
			<img src={props.episode.src} onClick={()=>props.click("next")}/>
		</div>
}



ReactDOM.render(

  <Router><div className="contents"><MenuBar/><ImageDisplay/></div></Router>,
  document.getElementById('root')
);