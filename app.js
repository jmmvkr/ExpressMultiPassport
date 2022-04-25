const express = require('express');
const ejs = require('ejs');


// init express app
var app = express();
app.engine('ejs', ejs.renderFile);

// enable development config
if ('development' === app.get('env')) {
    console.warn(' # dev-config applied');
    require("dotenv").config();
}

// prepare app config
var config = {
    port: process.env.PORT || 9000,
}

// show index page
app.get('/', function (req, res, next) {
    res.render('index.ejs');
});

// serve static content
app.use('/', express.static('views'));

// run server
var port = config.port;
app.listen(port, () => {
    console.log(`app started on port ${port}`);
});
