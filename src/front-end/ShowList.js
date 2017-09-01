const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const nav = require("./navigate").navigate;
import Paper from 'material-ui/Paper';
import LastPage from 'material-ui/svg-icons/navigation/last-page';
import Replay from 'material-ui/svg-icons/av/replay';
import IconButton from 'material-ui/IconButton';



class ShowList  extends React.Component{
    constructor(props){
        super(props);
        this.state={
            shows:null
        }
    }

    componentWillMount() {
        if (this.props.filter){
            data_loader.register_listener(this,"shows",this.props.filter);
        } else {
            data_loader.register_listener(this,"shows");
        }
    }

    componentWillUnmount() {
        data_loader.remove_listener(this);  
    }

    render() {
        if (!this.state.shows) {
            return <div className="columnFelx center" style={{width:resolve_width(this.props.width)}}> 
                <img src="/images/loading.gif" />
            </div>
        }



        let elems = [];
        let shows = this.state.shows;

        for (let i = 0; i<shows.length;i++) {
            elems.push(<ShowElement show={shows[i]} 
                width={this.props.width}
                key={shows[i].identifier} 
                new={this.props.filter=="new"}/>)
        }

        if(elems.length == 0) {
            elems = <p style={{
                margin:"auto",
                fontWeight: "bold",
                fontSize: "16px"
            }}>Nothing to see here, nothing matched the filter</p>
        }

        return <div className="center" style={{
            display:"flex",
            flexWrap:"wrap",
            flexDirection:"row",
            width:resolve_width(this.props.width),
        }}>
            {elems}
        </div>  
    }
}

const absolute = {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: "0",
    left: "0"
}

class ShowElement extends React.Component {
    constructor(props){
        super(props);
        this.primary_ontouch = this.primary_ontouch.bind(this);
    }

    primary_ontouch(){
        if(this.props.new){
            $.get("/data/shows/" + this.props.show.identifier,(data)=>{
                nav("/read/" + this.props.show.identifier + "/" + Math.min(data["new"]+1,this.props.show.episode_count) + "/new" );
            });         
        } else {
            nav("/read/" + this.props.show.identifier)
        }
    }

    render() {
        let s = this.props.show;

        let elems = [];

        if (s.logo) {
            elems.push(<img  src={s.logo} style={absolute} key="logo"/>);
        }

        elems.push(
            <div style={absolute} key="text">
                <div style={{
                    display:"flex",
                    paddingTop:"5px",
                    marginTop:"auto",
                    flexDirection:"row",
                    flexWrap:"wrap",
                    backgroundColor:"rgba(255, 255, 255, 0.3)"
                }}>
                    <div style={{
                        textAlign: "left",
                        fontSize: "20px",
                        fontWeight: "bold",
                        paddingLeft: "10px",
                        marginTop:"auto",
                        marginBottom:"auto"
                    }}>
                        <p style={{margin:"0px"}}>{s.name}</p>
                    </div>
                    <div style={{
                        display:"flex",
                        flexDirection:"row"
                    }}>
                        <NavButton id={s.identifier} type="reread"/>
                        <NavButton id={s.identifier} type="new"/>
                    </div>
                </div>
            </div>
        )
        
        //Basically we want the elements to fill the space availible
        let num_elem = Math.floor(resolve_width_int(this.props.width)/250);
        let width = Math.floor((resolve_width_int(this.props.width)/num_elem)-10);
        let height = Math.floor((3/5)*width)
    
        return <Paper zDepth={2} style={{
                    width:width+"px",
                    height:height+"px",
                    position:"relative",
                    margin:"5px",
                    cursor:"pointer",
                }} onTouchTap={this.primary_ontouch}>
                {elems}
            </Paper>
    }
}

function NavButton(props) {
    let elem = <LastPage/>;
    if (props.type == "reread") elem = <Replay/>;

    return  <IconButton onTouchTap={(e)=>{
        e.stopPropagation();
        $.get("/data/shows/" + props.id,(data)=>{
            nav("/read/" + props.id + "/" + data[props.type] + "/" + props.type);
        });
    }} >
        {elem}
    </IconButton>
}


module.exports = ShowList;


const data_loader = require("./show-data-loader");
const {resolve_width,resolve_width_int} = require("./helpers");