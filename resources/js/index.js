'use strict';

function MenuBar(props) {
	var categories = ["new", "webcomics", "anime"];
	return React.createElement(
		"div",
		{ className: "menubar" },
		categories.map(name => React.createElement(MenuItem, { name: name, key: name }))
	);
}

function MenuItem(props) {
	return React.createElement(
		"div",
		{ className: "menuItem" },
		React.createElement(
			"div",
			{ className: "vAlign" },
			props.name.charAt(0).toUpperCase() + props.name.slice(1)
		)
	);
}

class ImageDisplay extends React.Component {
	constructor(props) {
		super(props);
		this.state = { current: { src: "/images/loading.gif",
				number: 1,
				identifier: "",
				img: new Image(),
				data: undefined },
			next: null,
			prev: null,
			last: null,
			first: null };
		this.state.current.img.src = this.state.current.src;
		this.on_request = this.on_request.bind(this);
		this.update = this.update.bind(this);
	}

	on_request(type) {
		console.log(this.state[type]);
		this.setState({ current: this.state[type] }, () => {
			this.update("next", this.state.current);
			this.update("prev", this.state.current);
		});
	}

	componentDidMount() {
		this.update("current", { identifier: "ggar", number: 3 });
		this.update("next", { identifier: "ggar", number: 3 });
		this.update("prev", { identifier: "ggar", number: 3 });
		this.update("last", { identifier: "ggar", number: 3 });
		this.update("first", { identifier: "ggar", number: 3 });
	}

	update(type, episode) {
		var obj = this;
		$.get("/data/shows/" + episode.identifier + "/" + episode.number + "/" + type, null, function (data) {
			data.img = new Image();
			data.img.src = data.src;
			var tmp = {};
			tmp[type] = data;
			obj.setState(tmp);
		}, "json");
	}

	render() {
		return React.createElement(
			"div",
			{ className: "imageDisplay" },
			React.createElement(ImageContainer, { episode: this.state.current, click: this.on_request }),
			React.createElement(NavElements, { request: this.on_request })
		);
	}
}

function NavElements(props) {
	return React.createElement(
		"div",
		{ className: "imageNav" },
		React.createElement(NavButton, { direction: "back", image_src: "images/double_arrow.jpg", type: "first", click: props.request }),
		React.createElement(NavButton, { direction: "back", image_src: "images/single_arrow.jpg", type: "prev", click: props.request }),
		React.createElement(NavButton, { direction: "forward", image_src: "images/single_arrow.jpg", type: "next", click: props.request }),
		React.createElement(NavButton, { direction: "forward", image_src: "images/double_arrow.jpg", type: "last", click: props.request })
	);
}

class NavButton extends React.Component {
	constructor(props) {
		super(props);
		this.on_click = this.on_click.bind(this);
	}

	on_click(e) {
		e.preventDefault();
		this.props.click(this.props.type);
	}

	render() {
		var image_class = "navImage";
		if (this.props.direction === "back") {
			image_class += " flipped";
		}
		return React.createElement(
			"div",
			{ className: "navButton" },
			React.createElement("img", { className: image_class, src: this.props.image_src, onClick: this.on_click })
		);
	}
}

function ImageContainer(props) {
	return React.createElement(
		"div",
		{ className: "imageContainer" },
		React.createElement("img", { src: props.episode.src, onClick: () => props.click("next") })
	);
}

ReactDOM.render(React.createElement(
	"div",
	null,
	React.createElement(MenuBar, null),
	React.createElement(ImageDisplay, null)
), document.getElementById('root'));