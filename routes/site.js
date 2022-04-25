const express = require("express");


/**
 * Site level management utility for a Express.js site.
 * @memberof routes#
 * 
 * @tutorial [Usage]
 * <pre>
 * <code class='prettyprint'>
 * const express = require("express");
 * const Site = require('./routes/site.js');
 * 
 * // init express app
 * var app = express();
 * 
 * var config = {
 *     // options for site instance
 * };
 * 
 * // initialize and use a Site
 * var site = Site.makeOne(app, config);
 * app.use(site.router);
 * 
 * </code>
 * </pre> 
 */
class Site {

    /**
     * Created a site instance for givin exprss app, with given config options. <br />
     * <p>Please note that the site instance is not yet initialized. To get a site initialized site instance, please call 
     * <a href="#.makeOne">Site.makeOne()</a></p>
     * 
     * @see #.makeOne
     * @param {Object} app - The express app instance
     * @param {Object} config - Site config, that is, a set of options to be applied to created site instance
     */
    constructor(app, config) {
        this.router = new express.Router();
        this.app = app;
        this.config = config;
    }

    /**
     * Run initialization flow of this site, mainly add middlewares and routes.
     * @see #.makeOne
     * @see #addMiddlewares
     * @see #addRoutes
     */
    initialize() {
        this.addMiddlewares();
        this.addRoutes();
    }

    /**
     * Add middlewares to express app.
     */
    addMiddlewares() {
    }

    /**
     * Add routes to root router of this site.
     */
    addRoutes() {
        var router = this.router;

        // show index page
        router.get('/', function (req, res, next) {
            res.render('index.ejs');
        });

        // serve static content
        router.use('/', express.static('views'));

        // serve documentation
        router.use('/jsdoc', express.static('jsdoc'));
    }

    /**
     * Create an initialized Site instance. Middlewares and routes will be added after call to this method.
     * 
     * @param {Object} app - The express app instance
     * @param {Object} config - Site config, that is, a set of options to be applied to created site instance
     * @return {routes#Site} - The initialized site instance
     * @see #initialize
     */
    static makeOne(app, config) {
        var site = new Site(app, config);
        site.initialize();
        return site;
    }

}


module.exports = Site;
