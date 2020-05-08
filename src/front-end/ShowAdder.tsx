import * as React from 'react';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import RaisedButton from 'material-ui/RaisedButton';
import Toggle from 'material-ui/Toggle';
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
import {resolve_width, requiredProps, paramToName} from "./helpers";
import { Configuration } from '../configuration/Configuration';



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
                        onKeyDown={(e : React.KeyboardEvent<Element>) => e.nativeEvent.stopImmediatePropagation()}
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
                        onKeyDown={(e : React.KeyboardEvent<Element>) => e.nativeEvent.stopImmediatePropagation()}
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
                    onKeyDown={(e : React.KeyboardEvent<Element>) => e.nativeEvent.stopImmediatePropagation()}
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
                        onKeyDown={(e : React.KeyboardEvent<Element>) => e.nativeEvent.stopImmediatePropagation()}
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
                        onKeyDown={(e : React.KeyboardEvent<Element>) => e.nativeEvent.stopImmediatePropagation()}
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
                    onKeyDown={(e : React.KeyboardEvent<Element>) => e.nativeEvent.stopImmediatePropagation()}
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
            configuration ?: Configuration.Configurations,
            preconfiguration ?: Configuration.Preconfigurations,
            showType?: string,
            contentsValid: boolean,
            identifier: string,
            name: string,
            baseUrl: string,
            image_xpath?: string,
            text_xpath?: string,
            next_xpath?: string,
            requireJs: boolean;
            logo:string,
            doc?: any
    };

    constructor(props) {
        super(props);
        this.state = {
            contentsValid: false,
            requireJs: false,
            identifier: "",
            name: "",
            baseUrl: "",
            logo: "",
        }
        this.showTypeDropdownChange = this.showTypeDropdownChange.bind(this);
        this.preconfigDropdownChange = this.preconfigDropdownChange.bind(this);
        this.change = this.change.bind(this);
        this.create_show = this.create_show.bind(this);
        Link.getConfigurations().then((config) => this.setState({configuration : config}));
    }

    showTypeDropdownChange(event, index, value) {
        this.setState({
            showType: value,
            preconfiguration: undefined,
        });
    }

    preconfigDropdownChange(event, index, value: Configuration.Preconfigurations) {
        const newState = {
            preconfiguration: value,
        };

        Object.values(value).forEach((v) => Object.entries(v).forEach(([k,v]) => newState[k] = v));

        this.setState(newState);
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
        valid = s.identifier && s.showType && !!s.name;

        valid = requiredProps(this.state.configuration[this.state.showType], false).map(p => !!this.state[p]).reduce((valid, present) => valid && present, valid);

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
            data.type = s.showType;
            data.requireJS = s.requireJs;
            if (s.logo) data.logo = s.logo;
            requiredProps(this.state.configuration[this.state.showType], true).forEach(prop => data[prop] = s[prop]);

            Link.newShow(data).then((data) => navigate.showPage(data.identifier))
                .catch((e) => alert(e.message));
        }
    }

    render() {
        let remainder = [];

        if (!this.state.configuration) return <div></div>;

        const showTypes = Object.entries(this.state.configuration)
            .map(([name, val] : [string, Configuration.Configuration]) => 
                <MenuItem value={name} primaryText={val.displayname.singular} />);

        const topRow = <div style={{width: "100%", display : "flex"}}>
                <h1 className="pageTitle">
                    Add new show
                </h1>
                <DropDownMenu value={this.state.showType}
                              onChange={this.showTypeDropdownChange}
                              style={{alignSelf:"flex-end"}}>
                    {[<MenuItem value={undefined} primaryText="Select Type"/>]
                    .concat(showTypes)}
                  
                </DropDownMenu>
                <RaisedButton
                    label="Submit"
                    onClick={this.create_show}
                    style={{alignSelf:"flex-end"}}
                    disabled={!this.state.contentsValid}/>

        </div>

        if (this.state.showType) {
            const config = this.state.configuration[this.state.showType];

            remainder.push(
                <TextField
                    key="baseUrl"
                    value={this.state.baseUrl}
                    style={{width: "100%"}}
                    onChange={(e : React.FormEvent<HTMLFormElement>) => this.change("baseUrl", e.currentTarget.value)}
                    hintText="Start URL"/>
            );

            if (config.defaults) {
                remainder.push(<div key="logo" style={{display: "flex"}}>
                    <div style={{flex : "1"}}>
                        <InteractiveImage
                            text="Logo Url"
                            valName="logo"
                            change={this.change}
                            val={this.state.logo}/>
                    </div>
                    <DropDownMenu value={this.state.preconfiguration}
                              onChange={this.preconfigDropdownChange}>
                                  
                    {[<MenuItem value={undefined} primaryText="Select Preconfig"/>].concat(
                                  Object.entries(config.defaults).map(([name, val])=><MenuItem value={val} primaryText={name}/>))}
                    </DropDownMenu>
                </div>)
            } else {
                remainder.push(
                <div style={{width: "100%", paddingRight: "10px"}} key="logo">
                    <InteractiveImage
                        text="Logo Url"
                        valName="logo"
                        change={this.change}
                        val={this.state.logo}/>
                </div>)
            }
            
            remainder.push(
                <div style={{width: "100%", display:"flex"}}>
                    Requires JS to run <Toggle />
                </div>
            );

            requiredProps(this.state.configuration[this.state.showType], true).map((paramName) => <InteractiveXpath 
                key={paramName}
                text={paramToName(paramName)}
                valName={paramName}
                val={this.state[paramName]}
                doc={this.state.doc}
                url={this.state.baseUrl}
                change={this.change}
            />).forEach(v => remainder.push(v));
        }

        return <div className="showAdder columnFelx center" style={{width: resolve_width(this.props.width)}}>
            <div className="rowFlex">
                {topRow}
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
            </div>
            <div className="columnFelx" style={{width: "100%"}}>
                {remainder}
            </div>
        </div>;
    }

}