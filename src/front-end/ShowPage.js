const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const nav = require("./navigate").navigate;
const data_loader = require("./show-data-loader");
const {resolve_width} = require("./helpers");
import LastPage from 'material-ui/svg-icons/navigation/last-page';
import Replay from 'material-ui/svg-icons/av/replay';
import Delete from 'material-ui/svg-icons/action/delete-forever';
import Dialog from 'material-ui/Dialog';
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import Paper from 'material-ui/Paper';


class ShowPage  extends React.Component{
    constructor(props){
        super(props);
        this.state={
            show:null
        }
    }

    componentWillMount() {
        data_loader.register_show_listener(this,"show",this.props.show);
    }

    componentWillUnmount() {
        data_loader.remove_show_listener(this,this.props.show);
    }

    componentWillReceiveProps(newprops){
        if (this.props.show != newprops.show) {
            data_loader.remove_show_listener(this,this.props.show);
            data_loader.register_show_listener(this,"show",newprops.show);
        }
    }

    render() {
        if (!this.state.show) {
            return <div className="showPage columnFelx center" style={{
                    textAlign:"center",
                    width:resolve_width(this.props.width)
                }}> 
                <img src="/images/loading.gif" />
            </div>
        }

        let logo = null;
        if(this.state.show.logo) {
            logo = <Paper zDepth={1} key="logo" style={{
                    marginRight:"5px",
                    height:"108px",
                    maxWidth:"70%",           
                }}>
                <img src={this.state.show.logo}  style={{
                    height:"108px",
                    maxWidth:"100%",
                }}/>
            </Paper>
        } 

        return <div className="showPage columnFelx center" style={{width:resolve_width(this.props.width)}}>
            <div key="title" style={{
                width:"100%",
                textAlign: "left",
                fontSize: "24px",
                fontWeight: "bold",
                margingLeft: "5px",
                marginBottom:"3px"
            }}
            >{this.state.show.name}</div>
            <div className="rowFlex" style={{
                margin:"0px 2px",
            }}>   
                {logo}
                <div className="columnFelx" style={{
                    width:"100%"
                }}>
                    <NavButton id={this.props.show} type="new"/>
                    <NavButton id={this.props.show} type="reread"/>
                    <DeleteButton id={this.props.show} name={this.state.name}/>
                </div>
            </div>
            <div style={{marginTop:"10px"}}>
                <p style={{marginLeft:"5px"}}>Episodes: {this.state.show.episode_count}</p>
                <Previews id={this.props.show} count={this.state.show.episode_count}/>
            </div>
        </div>  
    }
}

const button_style = {
    width:"100%"
}

function NavButton(props) {
    let elem = <LastPage/>;
    let label = "Read New";
    if (props.type == "reread") {
        elem = <Replay/>;
        label = "Reread";
    }

    return  <RaisedButton icon={elem} labelPosition="before" label={label} style={button_style}
        onTouchTap={(e)=>{
            $.get("/data/shows/" + props.id,(data)=>{
                nav("/read/" + props.id + "/" + data[props.type] + "/" + props.type);
            });
        }
    }/>
}

class DeleteButton  extends React.Component{
    constructor(props){
        super(props);
        this.state = {confirm:false};
    }


    render() {
        let text = <p>Do you wish to delete <b>{this.props.name}</b>? This action is permanent.</p>;
        let title = "Confirm Deletion";
        if (!this.props.name) {
            text = <p>Do you wish to delete this show? This action is permanent.</p>;
            title = "Confirm Deletion of " + this.props.name;
        }

        let actions = [      
            <FlatButton
                label="No"
                primary={true}
                keyboardFocused={true}
                onClick={()=>this.setState({confirm:false})}/>,
            <FlatButton
                label="Yes"
                primary={true}
                onClick={(e)=>
                    $.ajax({
                        url:"/data/shows/" + this.props.id,
                        type:'DELETE',
                        success:(data)=>{
                            if (!data.failed) {
                                nav("/new");
                            }
                        }
                    })
                }/>,
        ]

        return <div>    
            <RaisedButton labelPosition="before" label="Delete Show" icon={<Delete/>} style={button_style}
                onTouchTap={(e)=>this.setState({confirm:true})}/>
            <Dialog
              title={title}
              actions={actions}
              modal={false}
              open={this.state.confirm}
              onRequestClose={()=>this.setState({confirm:false})}
            >
              {text}
            </Dialog>
        </div>      
    }

}

class Previews  extends React.Component{
    constructor(props){
        super(props);
        this.state={max:40}
    }

    componentWillMount(){
        $(window).scroll((()=>{
            if ($(window).scrollTop() >= $(document).height() - ($(window).height() + 5))  {
                if (this.props.count > this.state.max) {
                    this.setState({max:this.state.max+40});
                }           
            }
        }).bind(this));    

    }

    componentWillUnmount(){
        $(window).off("scroll");
    }

    render() {
        let eps = [];
        for (let i=1;i<=this.props.count && i <=this.state.max;i++){
            eps.push(<EpisodePreview num={i} key={i} id={this.props.id}/>)
        }



        return <div style={{
            width:"100%",
            display:"flex",
            flexWrap:"wrap",
            flexDirection:"row"
        }}>
                {eps}
        </div>
    }
}

class EpisodePreview  extends React.Component{
    constructor(props){
        super(props);
    }

    render() {
        let src="/shows/" + this.props.id + "/thumbnails/" + this.props.num + ".jpg";

        return <Paper onTouchTap={(e)=>{
            nav("/read/" + this.props.id + "/" + this.props.num + "/reread")
        }} style={{
            width:"102px",
            height:"170px",
            margin:"2px auto",
            textAlign:"center",
            overflow:"hidden",
            cursor:"pointer",
        }} zDepth={2}>
                <p style={{margin:"0px"}}>{this.props.num}</p>
                <img src={src} style={{
                    marginLeft:"auto",
                    marginRight:"auto",
                    maxHeight:"150px",
                    maxWidth:"100px"
                }}/>

            </Paper>
    }
}


module.exports = ShowPage;