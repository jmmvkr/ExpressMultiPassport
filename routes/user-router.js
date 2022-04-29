const express = require("express");


/**
 * Routes for user-related page / APIs.
 * @memberof routes#
 * 
 * @tutorial [Usage]
 * <pre>
 * <code class='prettyprint'>
 * const express = require("express");
 * const UserRouter = require("./user-router.js");
 * 
 * // in Site.addRoutes() or SomeRouter.addRoutes()
 * var router = this.router;
 * router.use('/user', UserRouter.makeOne(site));
 * 
 * </code>
 * </pre> 
 */
class UserRouter {

    /**
     * Created a UserRouter for given site.
     * 
     * @param {routes#Site} site - The given site instance, where <strong>middlewares</strong> in site may be useful.
     */
    constructor(site) {

        /** Express.js router for this UserRouter. */
        this.router = new express.Router();

        /** The Site that this UserRouter co-work with. */
        this.site = site;
    }

    /**
     * Add routes to a router owned by this instance.
     */
    addRoutes() {
        var router = this.router;
        var site = this.site;
        var account = site.account;

        // serve dashboard
        router.get('/dashboard', site.securePage, async function (req, res, next) {
            var email = '';
            if (req.user) {
                email = req.user.email;
            }

            var isVerified = false;
            var user;
            var userList = await account.findUsersByEmail(email);
            if (1 === userList.length) {
                user = userList[0];
                isVerified = user.verified;
            }

            res.render('dashboard.ejs', { isVerified });
        });

        // serve user profile
        router.get('/profile', site.securePage, async function (req, res, next) {
            var email = '';
            if (req.user) {
                email = req.user.email;
            }
            var userList = await account.findUsersByEmail(email);
            var user;
            var nickname = null;
            if (1 === userList.length) {
                user = userList[0];
                nickname = user.nickname;
            }
            res.render('profile.ejs', { nickname, email });
        });

        // change nickname in user profile
        router.post('/profile', site.securePage, async function (req, res, next) {
            var email = req.body.email;
            var nickname = req.body.nickname;
            if (email && nickname) {
                await account.changeUserNickname(email, nickname);
            }
            return res.redirect(req.originalUrl);
        });

        // serve user list
        router.get('/list', site.secureApi, async function (req, res, next) {
            var userList = await account.getUserList();
            res.json(userList);
        });

        // serve user statistics
        router.get('/statistics', site.secureApi, async function (req, res, next) {
            var userStatistics = await account.getUserStatistics();
            res.json(userStatistics);
        });
    }

    /**
     * Create an initialized UserRouter instance, and return owned router.
     * 
     * @param {routes#Site} site - The given site instance, where <strong>middlewares</strong> in site may be useful.
     * @return {Router} - The router instance owned by created UserRouter
     */
    static makeOne(site) {
        var instance = new UserRouter(site);
        instance.addRoutes();
        return instance.router;
    }

}

module.exports = UserRouter;
