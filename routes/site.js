const express = require("express");
const session = require('express-session');
const cookieParser = require('cookie-parser')
const passport = require('passport');
const LocalStrategy = require('passport-local');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const Account = require("../dal/account.js");
const PasswordChecker = require('../util/password-checker.js');
const UserRouter = require("./user-router.js");


// site specific constants
const USER_HOME = '/user/dashboard';
const RESTORED_LOGIN = 'x';
const LOCAL_LOGIN = 'local';

// input check constants
const ERROR_LOGIN_FAILED = new Error('Incorrect E-mail or Password');
const ERROR_INVALID_EMAIL = new Error('Invalid E-mail');
const ERROR_NO_EMAIL = new Error('Please input E-mail');
const ERROR_NO_PASSWORD = new Error('Please input Password');
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
 * const app = express();
 * 
 * const config = {
 *     // options for site instance
 * };
 * 
 * // initialize and use a Site
 * const site = Site.makeOne(app, config);
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
     * 
     * @throws {Error} When required option input (the inputValue) is missing.
     */
    static requiredOption(inputValue, message) {
        if (!inputValue) {
            throw new Error(message);
        }
        return inputValue;
    }

    /**
     * A site-level middleware for secure page that need user login. <br />
     * A cookie value named 'lastPage' will be stored to keep user in the same page.
     * 
     * @param {Request} req - The HTTP request
     * @param {Response} res - The HTTP response
     * @param {NextCallback} next - Callback of next Express.js middleware
     */
    securePage(req, res, next) {
        res.cookie('lastPage', req.originalUrl);
        if (req.isAuthenticated()) {
            return next();
        }
        return res.redirect('/signin');
    }

    /**
     * A site-level middleware for secure API that need user login. <br />
     * A cookie value named 'lastPage' will NOT be stored, because JSON is not friendly for normal user.
     * 
     * @param {Request} req - The HTTP request
     * @param {Response} res - The HTTP response
     * @param {NextCallback} next - Callback of next Express.js middleware
     */
    secureApi(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        return res.status(401).json({});
    }

    /**
     * Add middlewares to express app.
     */
    addMiddlewares() {
        // check required config input
        const config = this.config;
        Site.requiredOption(config.sessionOptions.secret, 'SESSION_SECRET not set');
        const cookieSecret = Site.requiredOption(config.cookieOptions.secret, 'COOKIE_SECRET not set');

        // add middlewares
        const app = this.app;
        app.use(session(config.sessionOptions));
        app.use(cookieParser(cookieSecret));
        app.use(express.json());
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
        const site = this;
        const router = this.router;

        // serve landing page
        /**
         * @swagger
         * paths:
         *   /:
         *     get:
         *       tags:
         *         - "landing"
         *       summary: Show the landing page
         *       responses:
         *         200:
         *           description: Always show the landing page
         */
        router.get('/', function (req, res, next) {
            res.render('index.ejs');
        });

        // serve sign-out
        /**
         * @swagger
         * paths:
         *   /signout:
         *     get:
         *       tags:
         *         - "account"
         *       summary: Sign out a user
         *       description: ""
         *       responses:
         *         200:
         *           description: Always redirect to /
         */
        router.get('/signout', function (req, res, next) {
            Site.signRestoreUser(res, '', '');
            req.logout();
            req.session.destroy();

            res.clearCookie('user').redirect('/');
            return next();
        });

        // serve sign-in page
        /**
         * @swagger
         * paths:
         *   /signin:
         *     get:
         *       tags:
         *         - "account"
         *       summary: Show the sign in page
         *       description: ""
         *       responses:
         *         200:
         *           description: Show the sign in page when user not yet signed in
         *         302:
         *           description: Redirect to previous page (stored in cookie) when signed in
         */
        router.get('/signin', site.tryRestoreLogin, function (req, res) {
            site.renderSignIn(req, res);
        });

        // serve password sign-in
        /**
         * @swagger
         * paths:
         *   /signin/password:
         *     post:
         *       tags:
         *         - "account"
         *       summary: Handle password sign in
         *       description: ""
         *       requestBody:
         *         content:
         *           application/x-www-form-urlencoded:
         *             schema:
         *               type: object
         *               properties:
         *                 emailAddr:
         *                   type: string
         *                   description: Email address of a user
         *                 password:
         *                   type: string
         *                   description: Raw password of a user
         *               required:
         *                - emailAddr
         *                - password
         *       responses:
         *         200:
         *           description: If client shows only the redirected page with 200 OK
         *         302:
         *           description: Redirect to sign in page with error message when sign in failed, or redirect to dashboard when sign in succeed.
         */
        router.post('/signin/password', site.localAuthenticate, function (err, req, res, next) {
            if (err) {
                site.renderSignIn(req, res, err);
            } else {
                res.redirect(USER_HOME);
            }
        });

        // serve sign-up page
        /**
         * @swagger
         * paths:
         *   /signup:
         *     get:
         *       tags:
         *        - "account"
         *       summary: Show the sign up page
         *       responses:
         *         200:
         *           description: Show the sign up page when user not yet signed in
         *         302:
         *           description: Redirect to previous page (stored in cookie) when signed in
         */
        router.get('/signup', site.tryRestoreLogin, function (req, res) {
            site.renderSignUp(req, res);
        });

        // serve password sign-up
        /**
         * @swagger
         * paths:
         *   /signup/password:
         *     post:
         *       tags:
         *        - "account"
         *       summary: Handle password sign up
         *       description: ""
         *       requestBody:
         *         content:
         *           application/x-www-form-urlencoded:
         *             schema:
         *               type: object
         *               properties:
         *                 emailAddr:
         *                   type: string
         *                   description: Email address of a user
         *                 password:
         *                   type: string
         *                   description: Raw password of a user
         *               required:
         *                - emailAddr
         *                - password
         *       responses:
         *         200:
         *           description: If client shows only the redirected page with 200 OK
         *         302:
         *           description: Redirect to sign up page with error message when sign up failed, or redirect to dashboard when sign up succeed.
         */
        router.post('/signup/password', async function (req, res, next) {
            const email = req.body.emailAddr;
            const password = req.body.password;
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

                    // sign in automatically when signed up
                    return passport.authenticate('db-auth')(req, res, function () {
                        return res.redirect(USER_HOME);
                    });
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
        /**
         * @swagger
         * paths:
         *   /f:
         *     get:
         *       tags:
         *        - "landing"
         *       summary: Show static content
         *       responses:
         *         200:
         *           description: Always show the static content, if present
         *         404:
         *           description: Show Not Found when no such static content
         *   /favicon.ico:
         *     get:
         *       tags:
         *        - "landing"
         *       summary: Show static content (site icon as an example)
         *       responses:
         *         200:
         *           description: Always show the static content, if present
         *         404:
         *           description: Show Not Found when no such static content
         */
        router.use('/', express.static('views'));

        // serve documentation (JSDoc)
        /**
         * @swagger
         * paths:
         *   /jsdoc:
         *     get:
         *       tags:
         *         - "docs"
         *       summary: Show JSDoc Document (JavaScript APIs)
         *       description: Document for JavaScript APIs
         *       responses:
         *         200:
         *           description: The JSDoc API Document
         */
        router.use('/jsdoc', express.static('jsdoc'));

        // serve documentation (Swagger UI)
        /**
         * @swagger
         * paths:
         *   /apidoc:
         *     get:
         *       tags:
         *         - "docs"
         *       summary: Show Swagger Document (RESTful APIs)
         *       description: Document for RESTful APIs
         *       responses:
         *         200:
         *           description: The REST API Document
         */
        this.addSwaggerRoute(router, '/apidoc');
    }

    /**
     * Serve Swagger UI on given url relative to given router.
     * @param {Router} router - Router to add the Swagger UI.
     * @param {string} url - URL relative to given router.
     */
    addSwaggerRoute(router, url) {
        const swaggerDefinition = {
            openapi: '3.0.0',
            info: {
                title: 'REST API Document',
                version: '1.0.0',
            },
        };
        const options = {
            swaggerDefinition,
            // Paths to files containing OpenAPI definitions
            apis: ['./routes/*.js'],
        };
        const swaggerSpec = swaggerJSDoc(options);
        // add swagger with option and spec
        router.use(url, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
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
        const site = this;
        const config = site.config;
        const localStrategy = new LocalStrategy(config.passportOptions, async function verify(email, password, cb) {
            const isRestored = (RESTORED_LOGIN === password);
            var succeed = false;
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
        const parsedPassword = req.body.password;
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
     * Middleware for restore login according to cookie.
     * 
     * @param {Request} req - The HTTP request
     * @param {Response} res - The HTTP response
     * @param {NextCallback} next - Callback of next Express.js middleware
     */
    tryRestoreLogin(req, res, next) {
        var signedUser = '';
        if (!req.isAuthenticated()) {

            // try to restore auth0 login
            var loginType = req.signedCookies.loginType;
            if (loginType && (LOCAL_LOGIN !== loginType)) {
                return next();
            }

            // try to restore local login
            signedUser = req.signedCookies.user;
            if (signedUser) {
                var user = req.signedCookies.user;
                req.body.emailAddr = user;
                req.body.password = req.signedCookies.password;

                return passport.authenticate('db-auth')(req, res, function () {
                    var redirectUri = req.cookies.lastPage || USER_HOME;
                    return Site.signRestoreUser(res, user).redirect(redirectUri);
                });
            }
            return next();
        }

        res.redirect(USER_HOME);
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
        const policy = RESTORE_COOKIE_POLICY;
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
        const site = new Site(app, config);
        site.initialize();
        return site;
    }

}


module.exports = Site;
