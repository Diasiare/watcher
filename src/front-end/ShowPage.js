const $ = require('jquery');
const React = require('react');
const ReactDOM = require('react-dom');
const nav = require("./navigate").navigate;
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
			name:"",
			logo:null
		}
	}

	componentWillMount() {
		$.get("/data/shows/" + this.props.show, null, (data)=>{
			if (data) {
				this.setState({
					name:data.name,
					logo:data.logo,
					episode_count:data.episode_count
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
				<div className="columnFelx" style={{
					marginLeft:"12px",
					width:"100%"
				}}>
					<NavButton id={this.props.show} type="new"/>
					<NavButton id={this.props.show} type="reread"/>
					<DeleteButton id={this.props.show} name={this.state.name}/>
				</div>
			</div>
			<div style={{marginTop:"10px"}}>
				<p>Episodes: {this.state.episode_count}</p>
				<Previews id={this.props.show} count={this.state.episode_count}/>
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

	return 	<RaisedButton icon={elem} labelPosition="before" label={label} style={button_style}
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
		if (!this.props.name) {
			text = <p>Do you wish to delete this show? This action is permanent.</p>
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
	          title="Dialog With Actions"
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
      		if (this.again && $(window).scrollTop() >= $(document).height() - ($(window).height() + 5))  {
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
			width:"100px",
			height:"170px",
			margin:"2px",
			textAlign:"center",
			overflow:"hidden"
		}} zDepth={2}>
				<p style={{margin:"0px"}}>{this.props.num}</p>
				<img src={src} style={{
					marginLeft:"auto",
					marginRight:"auto",
					maxHeight:"150px",
					maxWidth:"100%"
				}}/>

			</Paper>
	}
}


module.exports = ShowPage;