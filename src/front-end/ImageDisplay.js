const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const {Redirect,Link,Route} = require('react-router-dom');
const loader = require("./image-preloader");


function updateLastRead(show,number,type) {
	$.post("/data/shows/" + show + "/" + number + "/" + type);
}


function get_url_for(show,episode,read_type) {
	return "/read/" + show + "/" + episode + "/" + read_type ;
}

class ImageDisplay extends React.Component {
	constructor(props) {
		super(props);
		this.on_key = this.on_key.bind(this);
		this.navigate = this.navigate.bind(this);
		this.state= {next:null,
					prev:null,
					current:null,
					first:null,
					last:null};
	}

	on_key(e) {
		if (e.keyCode === 39) {
			this.navigate("next");
		} else if (e.keyCode ===37) {
			this.navigate("prev");
		} else {
			return;
		}
	}

	navigate(type) {
		if (this.state[type]) {
			let episode = this.state[type];
			updateLastRead(episode.identifier,episode.number,this.props.type);
			this.props.history.push(get_url_for(episode.identifier,episode.number,this.props.type));	
		}
	}

	componentWillMount() {
		$(document).on("keydown",this.on_key);
		["next","prev","current","first","last"].forEach((e)=>
			loader.register_callback(e,this,e));
		loader.change_episode(this.props.show,this.props.episode);
		updateLastRead(this.props.show,this.props.episode,this.props.type);
	}

	componentWillUnmount() {
		["next","prev","current","first","last"].forEach((e)=>
			loader.remove_callback(e,this));
		$(document).off("keydown",this.on_key);	
	}


	render () {
		let elems = []

		let info = this.state.current.data;

		if (info && "title" in info) {
			elems.push(<p key="title">{info.title}</p>)
		}

		elems.push(<ImageContainer episode={this.state.current} navigate={this.navigate} key="contaner"/>);
		if (info &&  "alt_text" in info) {
			elems.push(<p key="alt-text">{info.alt_text}</p>)
		}
		elems.push(<NavElements navigate={this.navigate} key="nav"/>);

		if (info && "text" in info) {
			elems.push(
				<div id="text_area" key="text">
					TEXT GOES HERE!!!!!!!!
				</div>
			)
		}

		let stuff = (
			<div className="imageDisplay">
				{elems}
			</div>);
		return stuff;
	}
}

function NavElements(props) {
	return <div className="imageNav">
			<NavButton direction="back" image_src="/images/double_arrow.jpg" type="first" navigate={props.navigate}/>
			<NavButton direction="back" image_src="/images/single_arrow.jpg" type="prev" navigate={props.navigate}/>
			<NavButton direction="forward" image_src="/images/single_arrow.jpg" type="next" navigate={props.navigate}/>
			<NavButton direction="forward" image_src="/images/double_arrow.jpg" type="last" navigate={props.navigate}/>
		</div>
}

class NavButton extends React.Component {
	constructor(props) {
		super(props);
	}


	render() {
		var image_class = "navImage";
		if (this.props.direction ==="back") {
			image_class += " flipped"
		}
		return <div className="navButton" onClick={()=>this.props.navigate(this.props.type)}>
			<img className={image_class} src={this.props.image_src}/>
		</div>	
	}
}


class ImageContainer extends React.Component {
	constructor(props) {
		super(props);
	}


	render() {
		if (this.props.episode) {
			return (<div className="imageContainer" onClick={()=>this.props.navigate("next")}>
						<img src={this.props.episode.src}/>
					</div>			
			)
		}


		return <div className="imageContainer">
				<img src="/images/loading.gif" />
			</div>	
	}
}

module.exports = ImageDisplay
