const express = require("express");
const session = require('express-session');


const Account = require("../dal/account.js");
const PasswordChecker = require('../util/password-checker.js');
const UserRouter = require("./user-router.js");


// site specific constants
const USER_HOME = '/user/dashboard';

// input check constants
const ERROR_INVALID_EMAIL = new Error('Invalid E-mail');
const ERROR_NO_EMAIL = new Error('Please input E-mail');
const RX_EMAIL = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{1,3})+$/;

// cookie policy constants
const SESSION_COOKIE_POLICY = {
    maxAge: 8 * 3600 * 1000,
    secure: false
}


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
     * @see #secureApi
     * @see #securePage
     * @param {Object} app - The express app instance
     * @param {Object} config - Site config, that is, a set of options to be applied to created site instance
     */
    constructor(app, config) {

        /** Express.js router of this site. */
        this.router = new express.Router();

        /** Express.js app instance, stored for future use (e.g. add middlewares). */
        this.app = app;

        /** Config object of this site. */
        this.config = config;
        config.sessionOptions.cookie = SESSION_COOKIE_POLICY;

        /** 
         * Account manager instance of this site.
         * @see Account
         */
        this.account = Account.makeOne();

        /** 
         * Password checker of this site. 
         * @see PasswordChecker
         */
        this.passwordChecker = new PasswordChecker({ enableSampleMessage: true });
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
     * A site-level middleware for secure page that need user login.
     * 
     * @param {Request} req - The HTTP request
     * @param {Response} res - The HTTP response
     * @param {NextCallback} next - Callback of next Express.js middleware
     */
    securePage(req, res, next) {
        return next();
    }

    /**
     * A site-level middleware for secure API that need user login.
     * 
     * @param {Request} req - The HTTP request
     * @param {Response} res - The HTTP response
     * @param {NextCallback} next - Callback of next Express.js middleware
     */
    secureApi(req, res, next) {
        return next();
    }

    /**
     * Add middlewares to express app.
     */
    addMiddlewares() {
        // add middlewares
        var config = this.config;
        var app = this.app;
        app.use(session(config.sessionOptions));
        app.use(express.urlencoded({ extended: false }));
    }

    /**
     * Add routes to root router of this site.
     */
    addRoutes() {
        var site = this;
        var router = this.router;

        // show index page
        router.get('/', function (req, res, next) {
            res.render('index.ejs');
        });

        // serve sign-up
        router.get('/signup', function (req, res) {
            site.renderSignUp(req, res);
        });
        router.post('/signup/password', async function (req, res, next) {
            var email = req.body.emailAddr;
            var password = req.body.password;
            var message;

            var result;
            var nickname;
            try {
                if (!email) {
                    throw ERROR_NO_EMAIL;
                }
                if (!RX_EMAIL.test(email)) {
                    throw ERROR_INVALID_EMAIL;
                }
                if (!password) {
                    throw ERROR_NO_PASSWORD;
                }
                result = site.passwordChecker.checkPassword(password);
                if (result.isValid) {
                    nickname = email.split('@')[0];
                    await site.account.emailSignUp(email, password, nickname);
                    return res.redirect(USER_HOME);
                } else {
                    message = site.concatMessage(result.invalidNotes);
                    return site.renderSignUp(req, res, { message });
                }
            } catch (err) {
                return site.renderSignUp(req, res, err);
            }
        });

        // serve user list & profile
        router.use('/user', UserRouter.makeOne(site));

        // serve static content
        router.use('/', express.static('views'));

        // serve documentation
        router.use('/jsdoc', express.static('jsdoc'));
    }

    /**
     * Render Sign-up page, with optional error message.
     * 
     * @param {Request} req - The HTTP request
     * @param {Response} res - The HTTP response
     * @param {MessageObject} [err] - Optional object with error message
     */
    renderSignUp(req, res, err) {
        if (err) {
            req.session.errorMessage = err.message;
            return res.redirect('/signup');
        }
        res.render('register.ejs', { errorMessage: this.consumeErrorMessage(req) });
    }

    /**
     * Cosume errorMessage stored in express session, and return the errorMessage if present.
     * 
     * @param {Request} req - The HTTP request
     * @return {string} - The errorMessage if present.
     * 
     * @tutorial [consumeErrorMessage]
     * <pre>
     * <code class='prettyprint'>
     * // Define render function, that place errorMessage into render parameter
     * renderSomePage(req, res, err) {
     *     if (err) {
     *         req.session.errorMessage = err.message;
     *     }
     *     res.render('page.ejs', { errorMessage: this.consumeErrorMessage(req) });
     *   }
     * 
     * // Handle normal case and error case in routes
     * callerInRoutes (req, res) {
     *     try {
     *         renderSomePage(req, res);
     *     } catch(err) {
     *         renderSomePage(req, res, err);
     *     }
     * }
     * </code>
       * </pre> 
     */
    consumeErrorMessage(req) {
        var errorMessage = req.session.errorMessage;
        req.session.errorMessage = null;
        return errorMessage;
    }

    /**
     * Concat messages in array of message objects into a single string, seperated by ASCII Line-Feed '\n' character.
     * 
     * @param {MessageObject[]} messageArray - array of message objects.
     * @return {string} - Concated string according to messageArray
     */
    concatMessage(messageArray) {
        var message = '';
        var i;
        for (i = 0; i < messageArray.length; i++) {
            if (i > 0) {
                message += '\\n';
            }
            message += messageArray[i].message;
        }
        return message;
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
