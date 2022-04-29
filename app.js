const express = require('express');
const ejs = require('ejs');
const Site = require('./routes/site.js');


// init express app
const app = express();
app.engine('ejs', ejs.renderFile);

// enable development config
if ('development' === app.get('env')) {
    console.warn(' # dev-config applied');
    require("dotenv").config();
}

// prepare app config
var config = {
    port: process.env.PORT || 9000,
    sessionOptions: {
        name: 'sess',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {}
    },
    cookieOptions: {
        secret: process.env.COOKIE_SECRET
    },
    passportOptions: {
        usernameField: 'emailAddr',
        passwordField: 'password'
    },
}

// initialize and use a Site
const site = Site.makeOne(app, config);
app.use('/', site.router);

// run server
const port = config.port;
app.listen(port, () => {
    console.log(`app started on port ${port}`);
});
