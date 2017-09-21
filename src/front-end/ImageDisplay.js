const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const {Redirect,Link,Route} = require('react-router-dom');
const loader = require("./image-preloader");
const nav = require("./navigate").navigate;
import Paper from 'material-ui/Paper';
import Replay from 'material-ui/svg-icons/av/replay';
import IconButton from 'material-ui/IconButton';
const {resolve_width,resolve_width_int} = require("./helpers");



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
            $('html, body').animate({ scrollTop: 0 }, 'fast');
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
        elems.push(<ImageContainer episode={this.state.current} 
            width={this.props.width} 
            navigate={this.navigate} key="container"/>);
        elems.push(<NavElements navigate={this.navigate} data={this.state.current} 
            width={this.props.width} key="nav"/>);

        if (info && "text" in info) {
            elems.push(<Description text={info.text} width={this.props.width} key="text"/>);
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
    return <div className="flex_center" style={{
                width:(resolve_width_int(props.width)-50)+"px",
                display: "flex",
                flexDirection : "row",
            }}>
            <NavButton type="first" navigate={props.navigate}/>
            <NavButton type="prev" navigate={props.navigate}/>
            <Redownload data={props.data} />
            <NavButton type="next" navigate={props.navigate}/>
            <NavButton type="last" navigate={props.navigate}/>
        </div>
}

class Redownload extends React.Component {
    constructor(props) {
        super(props);
        this.trigger = this.trigger.bind(this);
    }

    trigger() {
        $.post("/data/shows/"+this.props.data.identifier+"/"+this.props.data.number,null,(data)=>{
            if (!data.failed){
                location.reload();
            } else {
                let s = "Failed to redownload!\n\n";
                s+= data.error;
                alert(s);
            }
        });
    }

    render() {
        if (!this.props.data){
            return null;
        }

        return <div className="navButton flex_center" style={{textAlign:"center"}} onClick={this.trigger}>
            <img className="navImage" src="/images/redownload.png"/>
        </div>  
    }
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
                        <img src={this.props.episode.src} style={{
                            maxWidth:Math.min(1500,this.props.width-4)+"px",
                        }}/>
                        <AltText alt_text={this.props.episode.data.alt_text} width={this.props.width}/>
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

    return <div style={{
                marginBottom:"5px",
                marginLeft:"5px",    
                width:"95%",
                textAlign: "left",
                fontSize: "16px",
                fontWeight: "bold",
            }}>
                {props.title}
            </div>
}


function AltText(props) {
    if (!props.alt_text){
        return null;
    }

    return <div className="alt_text" style={{width:resolve_width(props.width)}}>
                <p style={{margin:"0px"}}>{props.alt_text}</p>
            </div>
}

function Description(props) {
	if (!props.text) {
		return null;
	}

    //This should be fine since the data in here is parsed directly from the source webpage (links may not resolve)
	return <Paper className="text_area" style={{
                width:resolve_width(props.width),
                }}
                dangerouslySetInnerHTML={{__html:props.text}}>
           </Paper>
}



module.exports = ImageDisplay