const express = require("express");
const session = require('express-session');
const cookieParser = require('cookie-parser')
const passport = require('passport');
const LocalStrategy = require('passport-local');


const Account = require("../dal/account.js");
const PasswordChecker = require('../util/password-checker.js');
const UserRouter = require("./user-router.js");


// site specific constants
const USER_HOME = '/user/dashboard';
const RESTORED_LOGIN = 'x';
const LOCAL_LOGIN = 'local';

// input check constants
const ERROR_INVALID_EMAIL = new Error('Invalid E-mail');
const ERROR_NO_EMAIL = new Error('Please input E-mail');
const RX_EMAIL = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{1,3})+$/;

// cookie policy constants
const SESSION_COOKIE_POLICY = {
    maxAge: 8 * 3600 * 1000,
    secure: false
}
const RESTORE_COOKIE_POLICY = {
    maxAge: 24 * 3600 * 1000,
    path: '/',
    signed: true
};


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
     * Utility function to ensure a required option present.
     * 
     * @param {AnyType} inputValue - The option input to be checked
     * @return {AnyType} - The given inputValue
     */
    static requiredOption(inputValue, message) {
        if (!inputValue) {
            throw new Error(message);
        }
        return inputValue;
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
        // check required config input
        var config = this.config;
        Site.requiredOption(config.sessionOptions.secret, 'SESSION_SECRET not set');
        var cookieSecret = Site.requiredOption(config.cookieOptions.secret, 'COOKIE_SECRET not set');

        // add middlewares
        var app = this.app;
        app.use(session(config.sessionOptions));
        app.use(cookieParser(cookieSecret));
        app.use(express.urlencoded({ extended: false }));
        app.use(passport.initialize());
        app.use(passport.session());

        // prepare passport
        this.preparePassport();
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

        // serve sign-in
        router.get('/signin', function (req, res) {
            site.renderSignIn(req, res);
        });
        router.post('/signin/password', site.localAuthenticate, function (err, req, res, next) {
            if (err) {
                site.renderSignIn(req, res, err);
            } else {
                res.redirect(USER_HOME);
            }
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
     * Prepare passport middleware.
     */
    preparePassport() {

        // set serializer / deserializer
        passport.serializeUser(async (user, done) => {
            var userObject = { email: user };
            done(null, userObject);
        });
        passport.deserializeUser((user, done) => {
            done(null, user);
        });

        // create LocalStrategy
        var site = this;
        var config = site.config;
        var localStrategy = new LocalStrategy(config.passportOptions, async function verify(email, password, cb) {
            var succeed = false;
            var isRestored = (RESTORED_LOGIN === password);
            try {
                if (!isRestored) {
                    succeed = await site.account.emailSignIn(email, password);
                }
                if (succeed || isRestored) {
                    await site.account.updateSession(email, isRestored);
                    return cb(null, email);
                } else {
                    return cb(null, false);
                }
            } catch (errSignIn) {
                console.error(errSignIn);
                return cb(errSignIn);
            }
        });

        // apply strategies
        passport.use('db-auth', localStrategy);
    }

    /**
     * Middleware for password login.
     * 
     * @param {Request} req - The HTTP request
     * @param {Response} res - The HTTP response
     * @param {NextCallback} next - Callback of next Express.js middleware
     */
    localAuthenticate(req, res, next) {
        var parsedPassword = req.body.password;
        if (parsedPassword && (RESTORED_LOGIN === parsedPassword)) {
            return next(ERROR_LOGIN_FAILED);
        }
        const cbAuthMiddleware = passport.authenticate('db-auth', { failureRedirect: '/signin' }, function (err, user, info) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return next(ERROR_LOGIN_FAILED);
            }
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                }
                return Site.signRestoreUser(res, req.user).redirect(USER_HOME);
            });
        });
        cbAuthMiddleware(req, res, next);
    }

    /**
     * Render Sign-in page, with optional error message.
     * 
     * @param {Request} req - The HTTP request
     * @param {Response} res - The HTTP response
     * @param {MessageObject} [err] - Optional object with error message
     */
    renderSignIn(req, res, err) {
        if (err) {
            req.session.errorMessage = err.message;
            return res.redirect('/signin');
        }
        return res.render('login.ejs', { errorMessage: this.consumeErrorMessage(req) });
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
     * Create a signed login record to be restored in the future.
     * 
     * @param {Response} res - The HTTP response
     * @param {string} email - E-mail address of a user
     * @param {string} [loginType] - Type of user login. Currently 'local', 'google-oauth2', and 'facebook' are supported.
     */
    static signRestoreUser(res, email, loginType) {
        var policy = RESTORE_COOKIE_POLICY;
        if (!loginType) {
            loginType = LOCAL_LOGIN;
        }
        return res.cookie('user', email, policy).cookie('loginType', loginType, policy).cookie('password', RESTORED_LOGIN, policy);
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
