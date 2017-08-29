const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const data_loader = require("./show-data-loader");
const nav = require("./navigate").navigate;
import IconButton from 'material-ui/IconButton';
import MenuItem from 'material-ui/MenuItem';
import Hamburger from 'material-ui/svg-icons/navigation/menu';
import DownArrow from 'material-ui/svg-icons/navigation/expand-more';
import UpArrow from 'material-ui/svg-icons/navigation/expand-less';
import LastPage from 'material-ui/svg-icons/navigation/last-page';
import Replay from 'material-ui/svg-icons/av/replay';
import New from 'material-ui/svg-icons/content/add-circle';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import ArrowDropRight from 'material-ui/svg-icons/navigation-arrow-drop-right';
import {List, ListItem, makeSelectable} from 'material-ui/List';
import Drawer from 'material-ui/Drawer';
import IconMenu from 'material-ui/IconMenu';
import Badge from 'material-ui/Badge';

var navigate = null;

const SelectableList = makeSelectable(List);

class Menu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {open:false};
        this.set_open = this.set_open.bind(this);
        this.change = this.change.bind(this);
    }

    componentWillMount() {
        navigate = ((location)=>{
            this.setState({open:false});
            nav(location);
        }).bind(this);
    }

    set_open(open) {
        this.setState({open:open});
    }

    change() {
        this.setState({open:!this.state.open}); 
    }

    render() {
        return <div>
            <ShortMenu action={this.change}/>
            <MenuDrawer open={this.state.open} action={this.set_open}/>
        </div>;
    }
}


class ShortMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            new_shows:[]
        }
    }

    componentWillMount() {
        data_loader.register_listener(this,"new_shows","new");
    }

    componentWillUnmount() {
        data_loader.remove_listener(this);  
    }

    render() {

        let new_menu_item = <IconButton onTouchTap={()=>navigate("/list/new")} 
            tooltip="New Episodes"
            tooltipPosition="bottom-right">
              <LastPage/>
           </IconButton>;
        if (this.state.new_shows.length > 0){
            new_menu_item = <Badge 
                badgeContent={this.state.new_shows.length}
                badgeStyle={{top: 0, right: 0}}
                style={{padding:"0px 0px 0px 0px"}}
                primary={true}
                >
                    {new_menu_item}
                </Badge>
        } 

        return <div className="menuOpenButton" style={{
                position: "fixed",
                top: "0px",
                left: "0px",
                display:"flex",
                flexDirection:"column"
            }}>
           <IconButton onTouchTap={this.props.action} 
           tooltip="Open Drawer"
           tooltipPosition="bottom-right">
              <Hamburger />
           </IconButton>
           <IconButton onTouchTap={()=>navigate("/new")} 
           tooltip="Add New Show"
           tooltipPosition="bottom-right">
                <New/>
            </IconButton>
           {new_menu_item}
           <IconMenu 
            tooltip="More Options"
            iconButtonElement={<IconButton><MoreVertIcon /></IconButton>}
            anchorOrigin={{horizontal: 'left', vertical: 'top'}}
            targetOrigin={{horizontal: 'left', vertical: 'top'}}
            >
                <MenuItem primaryText="All" onTouchTap={()=>navigate("/list")}/>
                <MenuItem primaryText="Webcomics" onTouchTap={()=>navigate("/list/webcomic")}/>
                <MenuItem primaryText="Manga" onTouchTap={()=>navigate("/list/manga")}/>
                <MenuItem primaryText="Backup" rightIcon={<ArrowDropRight />} menuItems={[
                    <MenuItem primaryText="Download" onTouchTap={()=>
                        document.getElementById('downloadFrame').src = "/data/backup.json"}/>,
                    <MenuItem primaryText="Uppload" onTouchTap={()=>
                            $("#backupSelect").click()
                        }/>,
                    ]}/>
            </IconMenu>
            <BackupHandlers/>
        </div>      
    }

}

function BackupHandlers(props) {
    return <div style={{display:"none"}}>
            <iframe id="downloadFrame" style={{display:"none"}}></iframe>
            <div style={{display:"none"}}>
                <form id="backupForm">
                    <input type="file" id="backupSelect" name="fileName" onChange={(e)=>{
                            e.preventDefault();
                            let file = document.getElementById('backupSelect').files;
                            if (file.length > 0) {
                                file = file[0];
                                let formData = new FormData();
                                formData.append('backup',file,"backup.json");
                                let xhr = new XMLHttpRequest();
                                xhr.open('POST', '/data/backup.json', true);
                                xhr.onload = function () {
                                    if (xhr.status === 200) {
                                        navigate("/list");
                                    } else {
                                        alert('An error occurred!');
                                    }
                                };
                                xhr.send(formData);
                            }                           
                        }
                    }/>
                </form>
            </div>
        </div>
}


function MenuDrawer(props) {
    let types = ["webcomic","manga"];
    return <Drawer
          docked={false}
          open={props.open}
          onRequestChange={props.action}
        >
            <SelectableList>
            {types.map((item)=>{
                return <SubMenu name={item} key={item}/>
            })}
            </SelectableList>
        </Drawer>
}

class ShowListing extends React.Component {


    render () {
        let s = this.props.show;
        return <div onTouchTap={()=>navigate("/read/" + s.identifier)}
                style={{
                    paddingTop:"5px",
                    paddingBottom:"5px",
                    display:"flex",
                    paddingLeft:(10 + this.props.nestedLevel*10) + "px",
                    marginTop:"auto",
                    flexDirection:"row",
                    flexWrap:"wrap",
                    cursor:"pointer"
            }}>
                <div style={{
                    textAlign: "left",
                    fontSize: "16px",
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
    }
}



function NavButton(props) {
    let elem = <LastPage/>;
    if (props.type == "reread") elem = <Replay/>;

    return  <IconButton onTouchTap={(e)=>{
        e.stopPropagation();
        $.get("/data/shows/" + props.id,(data)=>{       
            navigate("/read/" + props.id + "/" + data[props.type] + "/" + props.type);
        });
    }} >
        {elem}
    </IconButton>
}

class SubMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {shows:null,
                    open:true};
        this.change = this.change.bind(this);
    }

    componentWillMount() {
        data_loader.register_listener(this,"shows",this.props.name);
    }

    componentWillUnmount() {
        data_loader.remove_listener(this);  
    }

    change() {
        this.setState({open:!this.state.open});
    }

    render() {
        let name = this.props.name.charAt(0).toUpperCase() + this.props.name.slice(1) + "s"
        if (!this.state.shows) {
            return <ListItem>
                    {name}
                </ListItem>;
        } else if (!this.state.open) {
            return <ListItem onTouchTap={this.change} rightIcon={<DownArrow/>}>
                    {name}
                </ListItem>;
        }

        let sub_items = this.state.shows.map((show)=><ShowListing key={show.identifier} show={show}/>);

        return  <ListItem rightIcon={<UpArrow/>} onTouchTap={this.change} open={this.state.open} primaryText={name} 
            nestedItems={sub_items}>
        </ListItem>;
    }
}

module.exports = Menu;