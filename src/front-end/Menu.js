const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const data_loader = require("./show-data-loader");
import IconButton from 'material-ui/IconButton';
import MenuItem from 'material-ui/MenuItem';
import Hamburger from 'material-ui/svg-icons/navigation/menu';
import DownArrow from 'material-ui/svg-icons/navigation/expand-more';
import UpArrow from 'material-ui/svg-icons/navigation/expand-less';
import LastPage from 'material-ui/svg-icons/navigation/last-page';
import Replay from 'material-ui/svg-icons/av/replay';
import {List, ListItem, makeSelectable} from 'material-ui/List';
import Drawer from 'material-ui/Drawer';


const SelectableList = makeSelectable(List);

var navigate = null;

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
			this.props.navigate(location);
		}).bind(this);
		data_loader.preload_data();
	}

	set_open(open) {
		this.setState({open:open});
	}

	change() {
		this.setState({open:!this.state.open});	
	}

	render() {
		return <div>
			<MenuOpenButton action={this.change}/>
			<MenuDrawer open={this.state.open} action={this.set_open}/>
		</div>;
	}
}


function MenuOpenButton(props) {
	return <div className="menuOpenButton">
	   <IconButton onTouchTap={props.action}>
          <Hamburger />
       </IconButton>
	</div>
}


function MenuDrawer(props) {
	let types = ["webcomic"];
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
		return <ListItem primaryText={this.props.show.name} open={true} nestedItems={[
				<div className="listItemList" key="dontcomplain">
					<NavButton type="reread" id={this.props.show.identifier} />
					<NavButton type="new" id={this.props.show.identifier} />
				</div>
			]}>

			</ListItem>
	}
}



function NavButton(props) {
	let elem = <LastPage/>;
	if (props.type == "reread") elem = <Replay/>;

	return 	<IconButton onTouchTap={(e)=>{
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

		return 	<ListItem rightIcon={<UpArrow/>} onTouchTap={this.change} open={this.state.open} primaryText={name} 
			nestedItems={sub_items}>
		</ListItem>;
	}
}

module.exports = Menu;