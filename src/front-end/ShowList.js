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
		data_loader.register_listener(this,"shows");
	}

	componentWillUnmount() {
		data_loader.remove_listener(this);	
	}

	render() {
		if (!this.state.shows) {
			return <div className="columnFelx standardWidth center"> 
				<img src="/images/loading.gif" />
			</div>
		}



		let elems = [];
		let shows = this.state.shows;

		if (this.props.filter) {
			
		}

		for (let i = 0; i<this.state.shows.length;i++) {
			elems.push(<ShowElement show={shows[i]} key={i}/>)
		}

		return <div className="standardWidth center" style={{
			display:"flex",
			flexWrap:"wrap",
			flexDirection:"row"
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

		return <Paper zDepth={2} style={{
					width:"250px",
					height:"150px",
					position:"relative",
					margin:"5px",
					cursor:"pointer",
				}} onTouchTap={()=>nav("/read/" + s.identifier)}>
				{elems}
			</Paper>
	}
}

function NavButton(props) {
	let elem = <LastPage/>;
	if (props.type == "reread") elem = <Replay/>;

	return 	<IconButton onTouchTap={(e)=>{
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