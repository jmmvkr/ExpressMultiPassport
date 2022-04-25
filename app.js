const express = require('express');


// init express app
var app = express();

// enable development config
if ('development' === app.get('env')) {
    console.warn(' # dev-config applied');
    require("dotenv").config();
}

// prepare app config
var config = {
    port: process.env.PORT || 9000,
}

// show hello world in Express.js
app.use('/', function(req, res, next) {
    res.send('hello world');
});

// run server
var port = config.port;
app.listen(port, () => {
    console.log(`app started on port ${port}`);
});
