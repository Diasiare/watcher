const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const {Redirect,Link,Route} = require('react-router-dom');
const loader = require("./image-preloader");
const nav = require("./navigate").navigate;
import Paper from 'material-ui/Paper';


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
            nav(get_url_for(episode.identifier,episode.number,this.props.type));    
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
        elems.push(<ImageContainer episode={this.state.current} navigate={this.navigate} key="contaner"/>);
        elems.push(<NavElements navigate={this.navigate} key="nav"/>);

        if (info && "text" in info) {
            elems.push(<Description text={info.text} key="text"/>);
        }

        let stuff = (
            <div className="center">
              <div className="columnFlex flex_center">
                {elems}
              </div>
            </div>);
        return stuff;
    }
}

function NavElements(props) {
    return <div className="imageNav flex_center">
            <NavButton type="first" navigate={props.navigate}/>
            <NavButton type="prev" navigate={props.navigate}/>
            <NavButton type="next" navigate={props.navigate}/>
            <NavButton type="last" navigate={props.navigate}/>
        </div>
}

class NavButton extends React.Component {
    constructor(props) {
        super(props);
    }


    render() {
    	let p = {
    		first:{a:"left",d:"back",i:"/images/double_arrow.jpg"},
    		prev: {a:"center",d:"back",i:"/images/single_arrow.jpg"},
    		next: {a:"center",d:"forward",i:"/images/single_arrow.jpg"},
    		last: {a:"right",d:"forward",i:"/images/double_arrow.jpg"}
    	}[this.props.type];


        let image_class = "navImage";
        if (p.d ==="back") {
            image_class += " flipped"
        }
        return <div className="navButton flex_center" style={{textAlign:p.a}} onClick={()=>this.props.navigate(this.props.type)}>
            <img className={image_class} src={p.i}/>
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
                        <Title title={this.props.episode.data.title}/>
                        <img src={this.props.episode.src}/>
                        <AltText alt_text={this.props.episode.data.alt_text}/>
                    </div>          
            )
        }


        return <div className="imageContainer">
                <img src="/images/loading.gif" />
            </div>  
    }
}

function Title(props) {
    if (!props.title){
        return null;
    }

    return <div className="title" style={{
                marginBottom:"5px",
            }}>
                {props.title}
            </div>
}


function AltText(props) {
    if (!props.alt_text){
        return null;
    }

    return <div className="alt_text">
                {props.alt_text}
            </div>
}

function Description(props) {
	if (!props.text) {
		return null;
	}

    //This should be fine since the data in here is parsed directly from the source webpage (links may not resolve)
	return <Paper className="text_area standardWidth" dangerouslySetInnerHTML={{__html:props.text}}>
           </Paper>
}



module.exports = ImageDisplay