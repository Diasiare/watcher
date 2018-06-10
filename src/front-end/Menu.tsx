import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from'react-dom';
const data_loader = require("./show-data-loader");
import {navigate as nav} from "./navigate";
const {is_mobile} = require("./helpers");
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
import {Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle} from 'material-ui/Toolbar';
import Drawer from 'material-ui/Drawer';
import IconMenu from 'material-ui/IconMenu';
import Badge from 'material-ui/Badge';

var navigate = null;

const SelectableList = makeSelectable(List);


interface MenuProps {
    width : number,
}

class Menu extends React.Component {

    state : {
        open : boolean,
    }

    props : MenuProps;

    constructor(props: MenuProps) {
        super(props);
        this.state = {open: false};
        this.set_open = this.set_open.bind(this);
        this.change = this.change.bind(this);
    }

    componentWillMount() {
        navigate = ((location) => {
            this.setState({open: false});
            nav(location);
        }).bind(this);
    }

    set_open(open) {
        this.setState({open: open});
    }

    change() {
        this.setState({open: !this.state.open});
    }

    render() {
        return <div>
            <ShortMenu action={this.change} width={this.props.width}/>
            <MenuDrawer open={this.state.open} action={this.set_open}/>
        </div>;
    }
}



interface ShortMenuProps { 
    action : () => void,
    width : number
}

class ShortMenu extends React.Component {

    state : {
        new_shows : any[],
    }

    props : ShortMenuProps;

    constructor(props : ShortMenuProps) {
        super(props);
        this.state = {
            new_shows: []
        }
    }

    componentWillMount() {
        data_loader.register_listener(this, "new_shows", "new");
    }

    componentWillUnmount() {
        data_loader.remove_listener(this);
    }

    setSource() {
        (document.getElementById('downloadFrame') as HTMLImageElement).src = "/data/backup.json";
    }

    render() {

        let new_menu_item = <IconButton key="latest"
                                        onClick={() => navigate("/list/new")}
                                        tooltip="New Episodes"
                                        tooltipPosition="bottom-right">
            <LastPage/>
        </IconButton>;
        if (this.state.new_shows.length > 0) {
            new_menu_item = <Badge key="latest"
                                   badgeContent={this.state.new_shows.length}
                                   badgeStyle={{top: 0, right: 0}}
                                   style={{padding: "0px 0px 0px 0px"}}
                                   primary={true}
            >
                {new_menu_item}
            </Badge>
        }

        let items = [
            <IconButton key="open" onClick={this.props.action}
                        tooltip="Open Drawer"
                        tooltipPosition="bottom-right">
                <Hamburger/>
            </IconButton>,
            <IconButton key="new" onClick={() => navigate("/new")}
                        tooltip="Add New Show"
                        tooltipPosition="bottom-right">
                <New/>
            </IconButton>,
            new_menu_item,
            <IconMenu key="selecion"
                      iconButtonElement={<IconButton><MoreVertIcon/></IconButton>}
                      anchorOrigin={{horizontal: 'left', vertical: 'top'}}
                      targetOrigin={{horizontal: 'left', vertical: 'top'}}
            >
                <MenuItem primaryText="All" onClick={() => navigate("/list")}/>
                <MenuItem primaryText="Webcomics" onClick={() => navigate("/list/webcomic")}/>
                <MenuItem primaryText="Manga" onClick={() => navigate("/list/manga")}/>
                <MenuItem primaryText="Backup" rightIcon={<ArrowDropRight/>} menuItems={[
                    <MenuItem primaryText="Download" onClick={this.setSource}/>,

                    <MenuItem primaryText="Uppload" onClick={() =>
                        $("#backupSelect").click()
                    }/>,
                ]}/>
            </IconMenu>,
            <BackupHandlers key="invisible"/>
        ]

        if (is_mobile(this.props.width)) {
            return <Toolbar style={{
                width: "100%",
                margin: "0px 0px 5px 0px"
            }}>
                {items}
            </Toolbar>
        }


        return <div className="menuOpenButton" style={{
            position: "fixed",
            top: "0px",
            left: "0px",
            display: "flex",
            flexDirection: "column"
        }}>
            {items}
        </div>
    }

}

function BackupHandlers(props) {
    return <div style={{display: "none"}}>
        <iframe id="downloadFrame" style={{display: "none"}}></iframe>
        <div style={{display: "none"}}>
            <form id="backupForm">
                <input type="file" id="backupSelect" name="fileName" onChange={(e) => {
                    e.preventDefault();
                    let files = (document.getElementById('backupSelect') as HTMLInputElement).files;
                    if (files.length > 0) {
                        let file = files[0];
                        let formData = new FormData();
                        formData.append('backup', file, "backup.json");
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
    let types = ["webcomic", "manga"];
    return <Drawer
        docked={false}
        open={props.open}
        onRequestChange={props.action}
    >
        <SelectableList>
            {types.map((item) => {
                return <SubMenu name={item} key={item}/>
            })}
        </SelectableList>
    </Drawer>
}

class ShowListing extends React.Component {
    props : {
        show : any,
        nestedLevel ?: number,
        key : string
    }

    render() {
        let s = this.props.show;
        let props = {
            onClick : () => navigate("/read/" + s.identifier) ,
            style : {
                        paddingTop: "5px",
                        paddingBottom: "5px",
                        display: "flex",
                        paddingLeft: (10 + this.props.nestedLevel * 10) + "px",
                        marginTop: "auto",
                        flexDirection: "row",
                        flexWrap: "wrap",
                        cursor: "pointer"
             }
        }
        return <div {...props as {}}
                    >
            <div style={{
                textAlign: "left",
                fontSize: "16px",
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
    }
}


function NavButton(props) {
    let elem = <LastPage/>;
    if (props.type == "reread") elem = <Replay/>;

    return <IconButton onClick={(e) => {
        e.stopPropagation();
        $.get("/data/shows/" + props.id, (data) => {
            navigate("/read/" + props.id + "/" + data[props.type] + "/" + props.type);
        });
    }}>
        {elem}
    </IconButton>
}


interface SubMenuProps { 
    name : string,
}

class SubMenu extends React.Component {


    state : {
        open : boolean,
        shows : any[]
    }

    props : SubMenuProps;

    constructor(props : SubMenuProps) {
        super(props);
        this.state = {
            shows: null,
            open: true
        };
        this.change = this.change.bind(this);
    }

    componentWillMount() {
        data_loader.register_listener(this, "shows", this.props.name);
    }

    componentWillUnmount() {
        data_loader.remove_listener(this);
    }

    change() {
        this.setState({open: !this.state.open});
    }

    render() {
        let name = this.props.name.charAt(0).toUpperCase() + this.props.name.slice(1) + "s"
        if (!this.state.shows) {
            return <ListItem>
                {name}
            </ListItem>;
        } else if (!this.state.open) {
            return <ListItem onClick={this.change} rightIcon={<DownArrow/>}>
                {name}
            </ListItem>;
        }

        let sub_items = this.state.shows.map((show) => <ShowListing key={show.identifier} show={show}/>);

        return <ListItem rightIcon={<UpArrow/>} onClick={this.change} open={this.state.open} primaryText={name}
                         nestedItems={sub_items}>
        </ListItem>;
    }
}

module.exports = Menu;