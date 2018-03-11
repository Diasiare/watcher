//This is basically just a  test file that can be run to confirm that the components mostly function
//Basically I'll just be copying the JIT tests that I've written into here

import * as image_sequence from './downloaders/image_sequence';
import * as db from './data/config';
import * as config from './data/config';
import * as app from './webapp/app';
import * as fs from 'fs';
import * as Promise from 'bluebird' ;
import * as sqlite from 'sqlite' ;
const dom = require('xmldom').DOMParser;
const xpath = require('xpath').useNamespaces({"x": "http://www.w3.org/1999/xhtml"});

const test_db_name = "database.sqlite";
//delete database afterwards
const request = require('request');




db.init(test_db_name)
    .then(c=>c.shows)
    .then(console.log)
    .then(()=>db.restart_from("gint", 10, undefined, undefined, undefined, undefined))