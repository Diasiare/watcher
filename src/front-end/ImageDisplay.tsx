import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from'react-dom';
import {Redirect, Link, Route} from'react-router-dom';
import EpisodeNavigator from "./EpisodeNavigator";
import {navigate as nav} from "./navigate";
import Paper from 'material-ui/Paper';
import Replay from 'material-ui/svg-icons/av/replay';
import IconButton from 'material-ui/IconButton';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';
import Episode from './../types/FrontEndEpisode';
import Flink from '../link/FrontLink';
import ShowData from '../types/ShowData';


const {resolve_width, resolve_width_int} = require("./helpers");
const {extract_body, InteractiveXpath} = require("./ShowAdder");
import ShowCache from "./ShowDataCache";

function get_url_for(show, episode, read_type) {
    return "/read/" + show + "/" + episode + "/" + read_type;
}

interface ImageDisplayProps {
    type : string,
    show : string,
    width : number
}

class ImageDisplay extends React.Component {
    state : {
            current: Episode,
            menu_open: boolean
        };

    props : ImageDisplayProps; 


    public constructor(props : ImageDisplayProps) {
        super(props);
        this.on_key = this.on_key.bind(this);
        this.navigate = this.navigate.bind(this);
        this.flip_menu = this.flip_menu.bind(this);
        this.delete_current = this.delete_current.bind(this);
        this.state = {
            current: null,
            menu_open: false
        };
    }

    on_key (e) {
        if (e.keyCode === 39) {
            this.navigate("next");
        } else if (e.keyCode === 37) {
            this.navigate("prev");
        } else if (e.keyCode === 46) {
            this.delete_current();
        }else {
            return;
        }
    }

    delete_current() {
        let episode = this.state.current.number;
        let show = this.props.show;
        Flink.deleteEpisode(show, episode)
        .then(() => EpisodeNavigator.navigate("next"));
    }

    flip_menu() {
        this.setState({menu_open: !this.state.menu_open});
    }

    navigate(direction : string) {
        EpisodeNavigator.navigate(direction);
    }

    componentWillMount() {
        $(document).on("keydown", this.on_key);
        EpisodeNavigator.changeShow(this.props.show, this.props.type);
        EpisodeNavigator.registerCallback("ImageDisplay", (episode) => {
            this.setState({current : episode}); 
            $('html, body').animate({scrollTop: 0}, 'fast')
        });
    }

    componentWillReceiveProps(newProps : ImageDisplayProps) {
        if (this.props.show != newProps.show || this.props.type != newProps.type) {
            EpisodeNavigator.changeShow(newProps.show, newProps.type);
        }
    }

    componentWillUnmount() {
        EpisodeNavigator.removeCallback("ImageDisplay");
        $(document).off("keydown", this.on_key);
    }


    render() {
        let elems = []

        let info = this.state.current ? this.state.current.data : null;
        elems.push(<ImageContainer episode={this.state.current}
                                   width={this.props.width}
                                   navigate={this.navigate} key="container"/>);
        elems.push(<NavElements navigate={this.navigate}
                                width={this.props.width} flip_menu={this.flip_menu} delete_current={this.delete_current} key="nav"/>);

        if (this.state.menu_open) {
            elems.push(<Options episode={this.state.current} width={this.props.width}
                                key="options"/>)
        }

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
        width: (resolve_width_int(props.width) - 50) + "px",
        display: "flex",
        flexDirection: "row",
    }}>
        <NavButton type="first" navigate={props.navigate}/>
        <NavButton type="prev" navigate={props.navigate}/>
        <OptionsButton flip_menu={props.flip_menu}/>
        <DeleteEpisodeButton delete_current={props.delete_current}/>
        <NavButton type="next" navigate={props.navigate}/>
        <NavButton type="last" navigate={props.navigate}/>
    </div>
}

function DeleteEpisodeButton(props) {
    return <div className="navButton flex_center" style={{textAlign: "center"}} onClick={props.delete_current}>
        <img className="navImage" src="/images/delete.png"/>
    </div>
}

function OptionsButton(props) {
    return <div className="navButton flex_center" style={{textAlign: "center"}} onClick={props.flip_menu}>
        <img className="navImage" src="/images/options.png"/>
    </div>
}

interface OptionsProps {
        width : number,
        episode : Episode;
}

class Options extends React.Component {
    private show : ShowData = null;

    state : {
        new_url: string,
        imxpath: string,
        nextxpath: string,
        textxpath: string,
        doc
    }

    props : OptionsProps;


    constructor(props : OptionsProps) {
        super(props);
        this.state = {
                new_url : this.props.episode.base_url,
                imxpath: "",
                nextxpath: "",
                textxpath: "",
                doc : null,
        }

        this.restart = this.restart.bind(this);
        this.updateShow = this.updateShow.bind(this);
    }

    restart() {
        Flink.restartShow(this.props.episode.identifier, this.props.episode.number, this.state.new_url,
            this.state.nextxpath == this.show.next_xpath ? "" : this.state.nextxpath,
            this.state.imxpath == this.show.image_xpath ? "" : this.state.imxpath,
            this.state.textxpath == this.show.text_xpath ? "" : this.state.textxpath)
            .then(() => location.reload())
            .catch((e) => alert(e.message));
    }

    updateShow(show : ShowData) {
        this.show = show;
        if (show) {
            this.setState({
                imxpath: show.image_xpath,
                nextxpath: show.next_xpath,
                textxpath: show.text_xpath,
            })
        } else {
            this.setState({
                imxpath: "",
                nextxpath: "",
                textxpath: "",
            })
        }
    }

    componentWillMount() {
        Flink.getWebPage(this.state.new_url).then((data) => {
            if (data) {
                this.setState({doc: extract_body(data, this.props.episode.base_url)});
            }
        })
        ShowCache.registerSingleShowCallback(this.props.episode.identifier, "ImageDisplay.Options", this.updateShow);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.episode.base_url != nextProps.episode.base_url) {
            this.setState({new_url: nextProps.episode.base_url});
            Flink.getWebPage(nextProps.episode.base_url).then((data) => {
                if (data) this.setState({doc: extract_body(data, nextProps.episode.base_url)})
            })
        }

        if (this.props.episode.identifier != nextProps.episode.identifier) {
            ShowCache.removeSingleShowCallback("ImageDisplay.Options");
            ShowCache.registerSingleShowCallback(nextProps.episode.identifier, "ImageDisplay.Options", this.updateShow);
        }
    }

    componentWillUnmount() {
        ShowCache.removeSingleShowCallback("ImageDisplay.Options");
    }

    render() {
        return (<div style={{
            width: (resolve_width_int(this.props.width) - 50) + "px",
            display: "flex",
            flexDirection: "column",
        }}>
            <div className="flex_center" style={{
                width: (resolve_width_int(this.props.width) - 50) + "px",
                display: "flex",
                flexDirection: "row",
            }}>
                <Redownload data={this.props.episode}/>
                <RaisedButton
                    label="Open Original"
                    style={{
                        margin: "0px 5px",
                    }}
                    onClick={() => window.open(this.props.episode.base_url)}/>
                <TextField
                    key="new_url"
                    style={{
                        margin: "0px 5px",
                        flex: "1 1 auto"
                    }}
                    value={this.state.new_url}
                    onChange={(e : any) => this.setState({new_url: e.target.value})}
                    hintText="New URL"/>
                <RaisedButton
                    label="Restart"
                    style={{
                        margin: "0px 5px"
                    }}
                    onClick={this.restart}/>
            </div>
            <InteractiveXpath
                key="imxpath"
                text="Image Xpath"
                valName="imxpath"
                val={this.state.imxpath}
                doc={this.state.doc}
                url={this.props.episode.base_url}
                change={(name, value) => this.setState({imxpath : value})}/>
            <InteractiveXpath
                key="nextxpath"
                text="Next Xpath"
                valName="nextxpath"
                val={this.state.nextxpath}
                doc={this.state.doc}
                url={this.props.episode.base_url}
                change={(name, value) => this.setState({nextxpath : value})}/>
            <InteractiveXpath
                key="textxpath"
                text="Text Xpath"
                valName="textxpath"
                val={this.state.textxpath}
                doc={this.state.doc}
                url={this.props.episode.base_url}
                change={(name, value) => this.setState({textxpath : value})}/>
        </div>)
    }
}


interface RedownloadProps {
    data : Episode,
}

class Redownload extends React.Component {
    props : RedownloadProps;

    constructor(props : RedownloadProps) {
        super(props);
        this.trigger = this.trigger.bind(this);
    }

    trigger() {
        Flink.redownload(this.props.data.identifier, this.props.data.number)
            .then(() => location.reload())
            .catch((e) => alert(e.message));
    }

    render() {
        if (!this.props.data) {
            return null;
        }

        return <RaisedButton
            label="Redownload"
            onClick={this.trigger}/>
    }
}

interface NavButtonProps {
    type : string,
    navigate : (string) => void,
}


class NavButton extends React.Component {
    props : NavButtonProps;

    constructor(props : NavButtonProps) {
        super(props);
    }


    render() {
        let p = {
            first: {a: "left", d: "back", i: "/images/double_arrow.jpg"},
            prev: {a: "center", d: "back", i: "/images/single_arrow.jpg"},
            next: {a: "center", d: "forward", i: "/images/single_arrow.jpg"},
            last: {a: "right", d: "forward", i: "/images/double_arrow.jpg"}
        }[this.props.type];


        let image_class = "navImage";
        if (p.d === "back") {
            image_class += " flipped"
        }
        return <div className="navButton flex_center" style={{textAlign: p.a}}
                    onClick={() => this.props.navigate(this.props.type)}>
            <img className={image_class} src={p.i}/>
        </div>
    }
}


interface ImageConatainerProps {
        width : number;
        navigate : (string) => void,
        episode : Episode;
    }

class ImageContainer extends React.Component {
    props : ImageConatainerProps;

    constructor(props : ImageConatainerProps) {
        super(props);
    }


    render() {
        if (this.props.episode) {
            return (<div className="imageContainer" onClick={() => this.props.navigate("next")}>
                    <Title title={this.props.episode.data.title}/>
                    <img src={this.props.episode.src} style={{
                        maxWidth: Math.min(1500, this.props.width - 4) + "px",
                    }}/>
                    <AltText alt_text={this.props.episode.data.alt_text} width={this.props.width}/>
                </div>
            )
        }


        return <div className="imageContainer">
            <img src="/images/loading.gif"/>
        </div>
    }
}

function Title(props) {
    if (!props.title) {
        return null;
    }

    return <div style={{
        marginBottom: "5px",
        marginLeft: "5px",
        width: "95%",
        textAlign: "left",
        fontSize: "16px",
        fontWeight: "bold",
    }}>
        {props.title}
    </div>
}


function AltText(props) {
    if (!props.alt_text) {
        return null;
    }

    return <div className="alt_text" style={{width: resolve_width(props.width)}}>
        <p style={{margin: "0px"}}>{props.alt_text}</p>
    </div>
}

function Description(props) {
    if (!props.text) {
        return null;
    }

    //This should be fine since the data in here is parsed directly from the source webpage (links may not resolve)
    return <Paper className="text_area" style={{
        width: resolve_width(props.width),
    }}
                  dangerouslySetInnerHTML={{__html: props.text}}>
    </Paper>
}


module.exports = ImageDisplay