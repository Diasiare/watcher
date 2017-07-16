'use strict';

const express = require('express');
const image_sequence = require('./image_sequence/image_sequence');
const db = require('./data/db');
const config = require('./data/config');
// Constants
const PORT = 8080;

// App

/*
const app = express();
app.get('/', function (req, res) {
  res.send('Hello world\n');
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
*/



