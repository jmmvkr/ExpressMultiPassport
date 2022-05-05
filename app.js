const express = require('express');
const ejs = require('ejs');
const Site = require('./routes/site.js');
const EmailSender = require('./util/email-sender.js');


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
    serviceUri: process.env.SERVICE_BASE,
    corsOptions: {
        origin: 'https://' + process.env.AUTH0_DOMAIN,
        optionsSuccessStatus: 200
    },
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
    auth0Options: {
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        callbackURL: process.env.SERVICE_BASE + '/callback',
        auth0Logout: true,
        scope: "openid email profile"
    },
    passportOptions: {
        usernameField: 'emailAddr',
        passwordField: 'password'
    },
    mailOptions: {
        apiKey: process.env.SENDGRID_API_KEY,
        senderEmail: process.env.SENDGRID_SENDER,
        verifyUrl: process.env.SERVICE_BASE + '/user/verify'
    }
};

// initialize EmailSender
EmailSender.initialize(config.mailOptions);

// initialize and use a Site
const site = Site.makeOne(app, config);
app.use('/', site.router);

// run server
const port = config.port;
app.listen(port, () => {
    console.log(`app started on port ${port}`);
});
