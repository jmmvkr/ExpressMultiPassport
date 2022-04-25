const express = require("express");


class Site {

    constructor(app, config) {
        this.router = new express.Router();
        this.app = app;
        this.config = config;
    }

    initialize() {
        this.addMiddlewares();
        this.addRoutes();
    }

    addMiddlewares() {
    }

    addRoutes() {
        var router = this.router;

        // show index page
        router.get('/', function (req, res, next) {
            res.render('index.ejs');
        });

        // serve static content
        router.use('/', express.static('views'));
    }

    static makeOne(app, config) {
        var site = new Site(app, config);
        site.initialize();
        return site;
    }

}


module.exports = Site;
