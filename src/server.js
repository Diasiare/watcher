'use strict';

const express = require('express');
const image_sequence = require('./image_sequence/image_sequence');
// Constants
const PORT = 8080;

// App
const app = express();
app.get('/', function (req, res) {
  res.send('Hello world\n');
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);

image_sequence.download_sequence("http://www.gogetaroomie.com/comic/rolling-with-it","//div[@id='cc-comicbody']//img","//div[@id='cc-comicbody']/a"
	,"ggar", 1 , true);

