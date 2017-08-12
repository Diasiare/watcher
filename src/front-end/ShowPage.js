const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const nav = require("./navigate").navigate;
import IconButton from 'material-ui/IconButton';
import LastPage from 'material-ui/svg-icons/navigation/last-page';
import Replay from 'material-ui/svg-icons/av/replay';



class ShowPage  extends React.Component{
	constructor(props){
		super(props);
		this.state={
			name:"",
			logo:null
		}
	}

	componentWillMount() {
		$.get("/data/shows/" + this.props.show, null, (data)=>{
			if (data) {
				this.setState({
					name:data.name,
					logo:data.logo
				})
			}
		})
	}

	render() {
		if (!this.state.name) {
			return <div className="showPage columnFelx standardWidth center"> 
				<img src="/images/loading.gif" />
			</div>
		}

		let title_n_logo = null;
		if(this.state.logo) {
			title_n_logo = [
			<div className="title" key="title">{this.state.name}</div>,
			<img src={this.state.logo} key="logo"/>
			]
		} else {
			title_n_logo = [
				<div className="title" key="title">{this.state.name}</div>
			]
		}

		return <div className="showPage columnFelx standardWidth center">
			<div className="rowFlex">
				<div className="columnFelx">
					{title_n_logo}
				</div>
				<div className="columnFelx">
				<div>
			</div>
		</div>	
	}
}

function NavButton(props) {
	let elem = <LastPage/>;
	if (props.type == "reread") elem = <Replay/>;

	return 	<IconButton onTouchTap={(e)=>{
		$.get("/data/shows/" + props.id,(data)=>{
			nav("/read/" + props.id + "/" + data[props.type] + "/" + props.type);
		});
	}} >
		{elem}
	</IconButton>
}




module.exports = ShowPage;