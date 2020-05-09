import * as $ from 'jquery';
import * as React from 'react';
import EpisodeNavigator from "./EpisodeNavigator";
import Paper from 'material-ui/Paper';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';
import Episode from './../types/FrontEndEpisode';
import Flink from '../link/FrontLink';
import ShowData from '../types/ShowData';
import ShowDataCache from './ShowDataCache';
import ActionList from 'material-ui/svg-icons/action/list';
import {black, grey500} from 'material-ui/styles/colors';

import {resolve_width, resolve_width_int, requiredProps, paramToName} from "./helpers";
import  {extract_body, InteractiveXpath} from "./ShowAdder";
import ShowCache from "./ShowDataCache";
import ShowParameters from '../types/ShowParameters';
import { Configuration } from '../configuration/Configuration'; 
import Checkbox from 'material-ui/Checkbox';

interface ImageDisplayProps {
    type : string,
    show : string,
    width : number
}

export class ImageDisplay extends React.Component {
    state : {
            current: Episode[],
            menu_open: boolean,
            final_episode: number
            pageMode: boolean,
        };

    props : ImageDisplayProps; 


    public constructor(props : ImageDisplayProps) {
        super(props);
        this.on_key = this.on_key.bind(this);
        this.navigate = this.navigate.bind(this);
        this.flip_menu = this.flip_menu.bind(this);
        this.delete_current = this.delete_current.bind(this);
        this.setPageMode = this.setPageMode.bind(this);
        this.state = {
            current: [],
            menu_open: false,
            final_episode : 0,
            pageMode: EpisodeNavigator.getPageMode(),
        };
    }

    setPageMode(active: boolean) {
        this.setState({pageMode: active});
        EpisodeNavigator.setPageMode(active);
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
        this.state.current.forEach((e) => {
            let episode = e.number;
            let show = this.props.show;
            Flink.deleteEpisode(show, episode)
            .then(() => EpisodeNavigator.navigate("next"));
        })
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
        ShowDataCache.registerSingleShowCallback(this.props.show, "ImageDisplay", (data : ShowData) => {
            if (data) {
                this.setState({final_episode : data.episode_count});
            }
        })
    }

    componentWillReceiveProps(newProps : ImageDisplayProps) {
        if (this.props.show != newProps.show || this.props.type != newProps.type) {
            EpisodeNavigator.changeShow(newProps.show, newProps.type);
            ShowDataCache.removeSingleShowCallback("ImageDisplay");
            ShowDataCache.registerSingleShowCallback(newProps.show, "ImageDisplay", (data : ShowData) => {
                if (data) {
                    this.setState({final_episode : data.episode_count});
                }
            })
        }
    }

    componentWillUnmount() {
        EpisodeNavigator.removeCallback("ImageDisplay");
        ShowDataCache.removeSingleShowCallback("ImageDisplay");
        $(document).off("keydown", this.on_key);
    }


    render() {
        let elems = []


        if (this.state.current.length > 0) {
            elems.push(
                <div style={{
                    width: (resolve_width_int(this.props.width) - 100) + "px",
                    display: "flex",
                    flexDirection: "row",
                    }}>
                    <Title title={this.state.current[0].data.title}/>
                    <EpisodeCount max={this.state.final_episode} first={this.state.current[0].number} last={this.state.current[this.state.current.length -1].number}/>
                </div>);
        }

        this.state.current.forEach((episode, i) =>{
            elems.push(<ImageContainer episode={episode}
                                   width={this.props.width}
                                   navigate={this.navigate} 
                                   key={"container" + i}
                                   final_episode={this.state.final_episode}
                                   showAltText={!this.state.pageMode}
                                   />);
        });

        if (this.state.current.length === 0) {
            elems.push(
                <div className="imageContainer" key="loading">
                    <img src="/images/loading.gif"/>
                </div>);
        }

        elems.push(<NavElements navigate={this.navigate}
                                width={this.props.width} flip_menu={this.flip_menu} delete_current={this.delete_current} 
                                setPageLayout={this.setPageMode} key="nav"/>);

        if (this.state.menu_open && this.state.current.length > 0) {
            elems.push(<Options episode={this.state.current[this.state.current.length - 1]} width={this.props.width}
                                key="options"/>)
        }

        const text = this.state.current.map(episode => episode.data)
            .filter(data => "text" in data)
            .reduce((texts, data) => texts.concat(data.text), []);

        if (text.length > 0) {
            elems.push(<Description text={text} width={this.props.width} key="text"/>);
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
        <Checkbox
          checkedIcon={<ActionList color={black} style={{
            height: "40px",
            width: "40px",
        }}/>}
          uncheckedIcon={<ActionList color={grey500}  style={{
            height: "40px",
            width: "40px",
        }}/>}
          onCheck={(unused, checked) => props.setPageLayout(checked)}
          style={{
              flex: "1",
              height: "40px",
              width: "40px",
              alignItems: "center",
              justifyContent: "center",  
          }}
          labelStyle={{
              width: "0",
              padding: "0",
              margin: "0",
          }}
        />
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
        params: ShowParameters,
        configuration: Configuration.Configurations,
        doc
    }

    props : OptionsProps;


    constructor(props : OptionsProps) {
        super(props);
        this.state = {
                new_url : this.props.episode.base_url,
                params: {},
                configuration: {},
                doc : null,
        }

        this.restart = this.restart.bind(this);
        this.updateShow = this.updateShow.bind(this);

        Flink.getConfigurations().then(configuration => this.setState({configuration}, () => this.paramTransfer()));
    }

    restart() {
        const new_params : ShowParameters = {};
        Object.entries(this.state.params).forEach(([key, value]) => {
            if (value && value !== this.show[key]) {
                new_params[key] = value;
            }
        })

        Flink.restartShow(this.props.episode.identifier, this.props.episode.number, this.state.new_url, new_params)
            .then(() => location.reload())
            .catch((e) => alert(e.message));
    }

    updateShow(show : ShowData) {
        this.show = show;
        this.paramTransfer();
    }

    paramTransfer() {
        this.setState({params: requiredProps(this.state.configuration[this.show.type], true).reduce((p, v)=> {
            p[v] = this.show[v];
            return p;
        }, {})});
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
                    onKeyDown={(e : React.KeyboardEvent<Element>) => e.nativeEvent.stopImmediatePropagation()}
                    hintText="New URL"/>
                <RaisedButton
                    label="Restart"
                    style={{
                        margin: "0px 5px"
                    }}
                    onClick={this.restart}/>
            </div>
            {requiredProps(this.state.configuration[this.show.type], true).map(prop => {
                return <InteractiveXpath
                    key={prop}
                    text={paramToName(prop)}
                    valName={prop}
                    val={this.state.params[prop]}
                    doc={this.state.doc}
                    url={this.props.episode.base_url}
                    change={(name, value) => {
                        const s = {};
                        s[prop] = value;
                        this.setState({params: s});
                    }}/> 
            })}
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
        final_episode: number,
        episode : Episode;
        showAltText : boolean;
    }

class ImageContainer extends React.Component {
    props : ImageConatainerProps;

    constructor(props : ImageConatainerProps) {
        super(props);
    }


    render() {
            if (!this.props.showAltText) {
                return <img src={this.props.episode.src} onClick={() => this.props.navigate("next")} style={{
                    maxWidth: Math.min(1500, this.props.width - 4) + "px",
                }}/>
            }

            return (
                <div className="imageContainer" onClick={() => this.props.navigate("next")}>
                    <img src={this.props.episode.src} style={{
                        maxWidth: Math.min(1500, this.props.width - 4) + "px",
                     }}/>
                    {this.props.showAltText ? <AltText alt_text={this.props.episode.data.alt_text} width={this.props.width}/> : undefined}
                </div>
            )
    }
}

function Title(props) {
    if (!props.title) {
        return null;
    }

    return <div style={{
        marginBottom: "5px",
        marginLeft: "5px",
        flex : "1 1 auto",
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

interface EpisodeCountProps {
    first: number;
    last: number;
    max : number;
}

class EpisodeCount extends React.Component<EpisodeCountProps> {

    constructor(props) {
        super(props);
    }


    render() {
        return <div style={{
            fontWeight : "bold",
            flex : "1 0 auto",
            textAlign: "right",
        }} >
            {(this.props.first === this.props.last ? this.props.first : this.props.first + " - " + this.props.last) 
                + " / " + this.props.max}
        </div>
    }
}