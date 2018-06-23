import * as React from 'react';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';
import DownArrow from 'material-ui/svg-icons/navigation/expand-more';
import UpArrow from 'material-ui/svg-icons/navigation/expand-less';
import IconButton from 'material-ui/IconButton';
import Link from '../link/FrontLink';

const xpath = require('xpath').useNamespaces({"x": "http://www.w3.org/1999/xhtml"});
import * as parse5 from 'parse5';
import * as xmlser from 'xmlserializer';
import {DOMParser as dom} from 'xmldom';
import * as url from 'url';
import navigate from "./Navigator";
import {resolve_width} from "./helpers";

const manga_sources = [{
    name: "Mangareader"
    , next_xpath: "//div[@id='imgholder']/a"
    , image_xpath: "//div[@id='imgholder']/a/img"
},
    {
        name: "mangakakalot"
        , next_xpath: "//a[@class='back']"
        , image_xpath: "//div[@id='vungdoc']/img"
    },]

function strip_uri(doc, urld) {
    let v = new Set();
    let f = (e) => {
        v.add(e);
        if ('namespaceURI' in e) e.namespaceURI = null;
        if ('name' in e && (e.name == "src" || e.name == "href")) {
            e.value = url.resolve(urld, e.value);
            e.nodeValue = url.resolve(urld, e.nodeValue);
        }
        for (var p in e) {
            if (!v.has(e[p]) &&
                e[p] !== null &&
                typeof(e[p]) == "object") {
                f(e[p]);
            }
        }
    }
    f(doc);
    return doc;
}


export function extract_body(body, url) {
    var document = parse5.parse(body);
    var xhtml = xmlser.serializeToString(document);
    var doc = new dom().parseFromString(xhtml);
    return strip_uri(doc, url);
}

interface InteractiveXpathProps { 
    val : string,
    valName : string,
    text : string,
    change : (name: string, value: string) => void,
    doc : any,
    url : string,
}

export class InteractiveXpath extends React.Component<InteractiveXpathProps> {

    state : {
        show : boolean,
    }

    constructor(props : InteractiveXpathProps) {
        super(props);
        this.state = {
            show: true
        }
        this.openClose = this.openClose.bind(this);
    }

    openClose() {
        this.setState({show: !this.state.show});
    }

    render() {
        if ((!this.props.doc) || (!this.props.val) || this.props.val == "/") {
            return (<div className="columnFelx">
                <div style={{width: "100%"}} className="rowFlex">
                    <TextField
                        value={this.props.val}
                        style={{width: "100%"}}
                        onChange={(e : React.FormEvent<HTMLFormElement>) => this.props.change(this.props.valName, e.currentTarget.value)}
                        hintText={this.props.text}/>
                </div>
            </div>)
        } else if (!this.state.show) {
            return <div className="columnFelx">
                <div style={{width: "100%"}} className="rowFlex">
                    <TextField
                        value={this.props.val}
                        style={{width: "100%"}}
                        onChange={(e : React.FormEvent<HTMLFormElement>) => this.props.change(this.props.valName, e.currentTarget.value)}
                        hintText={this.props.text}/>
                    <IconButton onClick={this.openClose}>
                        <DownArrow/>
                    </IconButton>
                </div>
            </div>
        }
        let elems = null;
        try {
            elems = xpath(this.props.val, this.props.doc);
        } catch (e) {
        }
        let data = null;
        if (elems && elems.length > 0) {
            data = xmlser.serializeToString(elems[0], true);
        } else {
            data = "NOTHING";
        }


        return <div className="columnFelx">
            <div style={{width: "100%"}} className="rowFlex">
                <TextField
                    value={this.props.val}
                    style={{width: "100%"}}
                    onChange={(e : React.FormEvent<HTMLFormElement>) => this.props.change(this.props.valName, e.currentTarget.value)}
                    hintText={this.props.text}/>
                <IconButton onClick={this.openClose}>
                    <UpArrow/>
                </IconButton>
            </div>
            <div style={{width: "100%"}} dangerouslySetInnerHTML={{__html: data}}>
            </div>
        </div>


    }
}

interface InteractiveImageProps { 
    val : string,
    valName : string,
    text : string,
    change : (name: string, value: string) => void
}

export class InteractiveImage extends React.Component<InteractiveImageProps> {
    
    state : {
        show : boolean;
    }

    constructor(props : InteractiveImageProps) {
        super(props);
        this.state = {
            show: true
        }
        this.openClose = this.openClose.bind(this);
    }

    openClose() {
        this.setState({show: !this.state.show});
    }

    render() {
        if ((!this.props.val)) {
            return (<div className="columnFelx">
                <div style={{width: "100%"}} className="rowFlex">
                    <TextField
                        value={this.props.val}
                        style={{width: "100%"}}
                        onChange={(e : React.FormEvent<HTMLFormElement>) => this.props.change(this.props.valName, e.currentTarget.value)}
                        hintText={this.props.text}/>
                </div>
            </div>)
        } else if (!this.state.show) {
            return <div className="columnFelx">
                <div style={{width: "100%"}} className="rowFlex">
                    <TextField
                        value={this.props.val}
                        style={{width: "100%"}}
                        onChange={(e : React.FormEvent<HTMLFormElement>) => this.props.change(this.props.valName, e.currentTarget.value)}
                        hintText={this.props.text}/>
                    <IconButton onClick={this.openClose}>
                        <DownArrow/>
                    </IconButton>
                </div>
            </div>
        }

        return <div className="columnFelx">
            <div style={{width: "100%"}} className="rowFlex">
                <TextField
                    value={this.props.val}
                    style={{width: "100%"}}
                    onChange={(e : React.FormEvent<HTMLFormElement>) => this.props.change(this.props.valName, e.currentTarget.value)}
                    hintText={this.props.text}/>
                <IconButton onClick={this.openClose}>
                    <UpArrow/>
                </IconButton>
            </div>
            <div style={{width: "100%", textAlign: "center"}}>
                <img src={this.props.val} alt="Not loaded yet"/>
            </div>
        </div>

    }
}


interface ShowAdderProps {
    width : number,
}

export class ShowAdder extends React.Component<ShowAdderProps> {

    state : {
            showType: number,
            contentsValid: boolean,
            identifier: string,
            name: string,
            baseUrl: string,
            imxpath: string,
            nextxpath:string,
            textxpath: string,
            logo:string,
            manga_type: number,
            doc: any
    };

    constructor(props) {
        super(props);
        this.state = {
            showType: 1,
            contentsValid: false,
            identifier: "",
            name: "",
            baseUrl: "",
            imxpath: "",
            nextxpath: "",
            textxpath: "",
            logo: "",
            manga_type: 0,
            doc: null
        }
        this.showTypeDropdownChange = this.showTypeDropdownChange.bind(this);
        this.change = this.change.bind(this);
        this.create_show = this.create_show.bind(this);
    }

    showTypeDropdownChange(event, index, value) {
        this.setState({showType: value});
    }

    change(s, v) {
        if (s == "baseUrl") {
            Link.getWebPage(v).then((data) => {
                if (data) {
                    this.setState({doc: extract_body(data, v)});
                }
            })
        }
        let tmp = {};
        tmp[s] = v;
        this.setState(tmp, this.validate);
    }

    validate() {
        let valid = false;
        let s = this.state;
        valid = valid
            || Boolean(s.showType == 2
                && s.identifier
                && s.name
                && s.nextxpath
                && s.imxpath
                && s.baseUrl)
            || Boolean(s.showType == 3
                && s.identifier
                && s.name
                && s.baseUrl
            );

        //Force valid to be a boolan, otherwise it might be a string or smth
        if (valid) valid = true;
        else valid = false;

        if (valid != s.contentsValid) {
            this.setState({contentsValid: !s.contentsValid})
        }
    }

    create_show() {
        if (this.state.contentsValid) {
            let data : any = {}
            let s = this.state;
            data.identifier = s.identifier;
            data.name = s.name;
            data.base_url = s.baseUrl;
            if (s.logo) data.logo = s.logo;
            if (s.showType == 2) {
                data.next_xpath = s.nextxpath;
                data.image_xpath = s.imxpath;
                data.type = "webcomic"
                if (s.textxpath) {
                    data.text_xpath = s.textxpath;
                }
            } else if (s.showType == 3) {
                data.type = "manga";
                data.next_xpath = manga_sources[s.manga_type].next_xpath;
                data.image_xpath = manga_sources[s.manga_type].image_xpath;
            }

            Link.newShow(data).then((data) => navigate.showPage(data.identifier))
                .catch((e) => alert(e.message));
        }
    }

    render() {
        let remainder = [];
        let r2_extra = [];


        if ([3].includes(this.state.showType)) {
            r2_extra.push(<DropDownMenu key="manga_source"
                                        value={this.state.manga_type}
                                        onChange={(event, index, value) => this.change("manga_type", value)}>
                {manga_sources.map((m, i) => <MenuItem key={i} value={i} primaryText={m.name}/>)}
            </DropDownMenu>);
        }


        if ([2, 3].includes(this.state.showType)) {
            remainder.push(
                <TextField
                    key="baseUrl"
                    value={this.state.baseUrl}
                    style={{width: "100%"}}
                    onChange={(e : React.FormEvent<HTMLFormElement>) => this.change("baseUrl", e.currentTarget.value)}
                    hintText="Start URL"/>
            );
        }


        if ([2].includes(this.state.showType)) {
            remainder.push(
                <InteractiveXpath
                    key="imxpath"
                    text="Image Xpath"
                    valName="imxpath"
                    val={this.state.imxpath}
                    doc={this.state.doc}
                    url={this.state.baseUrl}
                    change={this.change}/>
            );
            remainder.push(
                <InteractiveXpath
                    key="nextxpath"
                    text="Next Xpath"
                    valName="nextxpath"
                    val={this.state.nextxpath}
                    doc={this.state.doc}
                    url={this.state.baseUrl}
                    change={this.change}/>
            );
            remainder.push(
                <InteractiveXpath
                    key="textxpath"
                    text="Text Xpath"
                    valName="textxpath"
                    val={this.state.textxpath}
                    doc={this.state.doc}
                    url={this.state.baseUrl}
                    change={this.change}/>
            );
        }


        return <div className="showAdder columnFelx center" style={{width: resolve_width(this.props.width)}}>
            <div className="rowFlex">
                <h1 className="pageTitle">
                    Add new show
                </h1>
                <DropDownMenu value={this.state.showType}
                              onChange={this.showTypeDropdownChange}>
                    <MenuItem value={1} primaryText="Select Type"/>
                    <MenuItem value={2} primaryText="Webcomic"/>
                    <MenuItem value={3} primaryText="Manga"/>
                </DropDownMenu>
                <div style={{width: "100%", paddingRight: "10px"}}>
                    <InteractiveImage
                        text="Logo Url"
                        valName="logo"
                        change={this.change}
                        val={this.state.logo}/>
                </div>
                <div>
                    <RaisedButton
                        label="Submit"
                        onClick={this.create_show}
                        disabled={!this.state.contentsValid}/>
                </div>
            </div>
            <div className="rowFlex">
                <TextField
                    value={this.state.identifier}
                    style={{marginRight: "20px", flexGrow: 1}}
                    onChange={(e : React.FormEvent<HTMLFormElement>) => this.change("identifier", e.currentTarget.value)}
                    hintText="Identifier"/>
                <TextField
                    value={this.state.name}
                    style={{flexGrow: 1}}
                    onChange={(e : React.FormEvent<HTMLFormElement>) => this.change("name", e.currentTarget.value)}
                    hintText="Name"/>
                {r2_extra}
            </div>
            <div className="columnFelx" style={{width: "100%"}}>
                {remainder}
            </div>
        </div>;
    }

}