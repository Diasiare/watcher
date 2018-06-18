import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from'react-dom';
const nav = require("./navigate").navigate;
import ShowData from '../types/ShowData';
import Paper from 'material-ui/Paper';
import LastPage from 'material-ui/svg-icons/navigation/last-page';
import Replay from 'material-ui/svg-icons/av/replay';
import IconButton from 'material-ui/IconButton';
import Link from '../link/FrontLink';
import ShowCache from "./ShowDataCache";


interface ShowListProps {
    filter : string,
    width: number,
}

class ShowList extends React.Component<ShowListProps> {
    state : {
        shows : ShowData[],
    }

    constructor(props) {
        super(props);
        this.state = {
            shows: null
        }
    }

    componentWillMount() {
        ShowCache.registerAllShowsCallback("ShowList", (shows) => {
            if (this.props.filter && this.props.filter != "new") {
                this.setState({
                    shows : shows.filter((show) => show.type == this.props.filter)
                })
            } else if (this.props.filter && this.props.filter == "new") {
                this.setState({
                    shows : shows.filter((show) => show.new != 0 && show.episode_count != show.new)
                })
            } else {
                this.setState({
                    shows : shows
                });
            }
        });
    }

    componentWillUnmount() {
        ShowCache.removeAllShowsCallback("ShowList");
    }

    render() {
        if (!this.state.shows) {
            return <div className="columnFelx center" style={{width: resolve_width(this.props.width)}}>
                <img src="/images/loading.gif"/>
            </div>
        }


        
        let shows = this.state.shows;
        let elems : any = shows.map((show => 
                <ShowElement show={show}
                    width={this.props.width}
                    key={show.identifier} 
                    new = {this.props.filter === "new"}/>
            ))

        if (elems.length == 0) {
            elems = [<p key="empty" style={{
                margin: "10px auto 0px auto",
                fontWeight: "bold",
                fontSize: "16px"
            }}>Nothing to see here, nothing matched the filter</p>]
        }

        return <div className="center" style={{
            display: "flex",
            flexWrap: "wrap",
            flexDirection: "row",
            width: resolve_width(this.props.width),
        }}>
            {elems}
        </div>
    }
}

const absolute = {
    width: "100%",
    height: "100%",
    position: 'absolute' as 'absolute',
    top: "0",
    left: "0"
}

interface ShowElementProps {
    show : ShowData,
    width : number,
    key : string,
    new : boolean,
}

class ShowElement extends React.Component<ShowElementProps> {

    constructor(props) {
        super(props);
        this.primary_ontouch = this.primary_ontouch.bind(this);
        this.state = {};
    }

    primary_ontouch() {
        if (this.props.new) {
            Link.getRelativeEpisode(this.props.show.identifier, this.props.show.new, "next")
            .then((episode) => Link.updateLastRead(this.props.show.identifier, episode.number, "new"))
            .then(() => nav("/read/" + this.props.show.identifier + "/new"));
        } else {
            nav("/read/" + this.props.show.identifier)
        }
    }

    render() {
        let s = this.props.show;

        let elems = [];

        if (s.logo) {
            elems.push(<img src={s.logo} style={absolute} key="logo"/>);
        }

        elems.push(
            <div style={absolute} key="text">
                <div style={{
                    display: "flex",
                    paddingTop: "5px",
                    marginTop: "auto",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    backgroundColor: "rgba(255, 255, 255, 0.3)"
                }}>
                    <div style={{
                        textAlign: "left",
                        fontSize: "20px",
                        fontWeight: "bold",
                        paddingLeft: "10px",
                        marginTop: "auto",
                        marginBottom: "auto"
                    }}>
                        <p style={{margin: "0px"}}>{s.name}</p>
                    </div>
                    <div style={{
                        display: "flex",
                        flexDirection: "row"
                    }}>
                        <NavButton id={s.identifier} type="reread"/>
                        <NavButton id={s.identifier} type="new"/>
                    </div>
                </div>
            </div>
        )

        //Basically we want the elements to fill the space availible
        let num_elem = Math.floor(resolve_width_int(this.props.width) / 250);
        let width = Math.floor((resolve_width_int(this.props.width) / num_elem) - 10);
        let height = Math.floor((3 / 5) * width)

        return <Paper zDepth={2} style={{
            width: width + "px",
            height: height + "px",
            position: "relative",
            margin: "5px",
            cursor: "pointer",
        }} onClick={this.primary_ontouch}>
            {elems}
        </Paper>
    }
}

function NavButton(props) {
    let elem = <LastPage/>;
    if (props.type == "reread") elem = <Replay/>;

    return <IconButton onClick={(e) => {
        e.stopPropagation();
        nav("/read/" + props.id + "/" + props.type);
    }}>
        {elem}
    </IconButton>
}


module.exports = ShowList;

const {resolve_width, resolve_width_int} = require("./helpers");