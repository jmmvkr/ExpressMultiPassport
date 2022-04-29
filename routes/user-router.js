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
 * const router = this.router;
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
        const router = this.router;
        const site = this.site;
        const account = site.account;

        // serve dashboard
        router.get('/dashboard', site.securePage, async function (req, res, next) {
            var email = '';
            if (req.user) {
                email = req.user.email;
            }

            const userList = await account.findUsersByEmail(email);
            var user;
            var id;
            var isVerified = false;
            if (1 === userList.length) {
                user = userList[0];
                isVerified = user.verified;
                id = user.id;
            }

            res.render('dashboard.ejs', { id, isVerified });
        });

        // serve user profile
        router.get('/profile', site.securePage, async function (req, res, next) {
            var email = '';
            if (req.user) {
                email = req.user.email;
            }
            const userList = await account.findUsersByEmail(email);
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
            const email = req.body.email;
            const nickname = req.body.nickname;
            if (email && nickname) {
                await account.changeUserNickname(email, nickname);
            }
            return res.redirect(req.originalUrl);
        });

        // serve user list
        router.get('/list', site.secureApi, async function (req, res, next) {
            const userList = await account.getUserList();
            res.json(userList);
        });

        // serve user statistics
        router.get('/statistics', site.secureApi, async function (req, res, next) {
            const userStatistics = await account.getUserStatistics();
            res.json(userStatistics);
        });

        // serve reset password
        router.post('/reset-password', async function (req, res, next) {
            try {
                const userId = parseInt(req.body.userId);
                const oldPassword = (req.body.oldPassword);
                const newPassword = (req.body.password);
                var message = 'Not signed in';
                var isValid = false;

                if (!req.isAuthenticated()) {
                    return res.json({ isValid, message });
                }
                if (!userId) {
                    return res.json({ isValid, message });
                }

                var user = await account.findUserById(userId);
                var result;
                var updateCount;
                if (user && (user.email === req.user.email)) {
                    result = site.passwordChecker.checkPassword(newPassword);
                    if (!result.isValid) {
                        message = site.concatMessage(result.invalidNotes);
                        return res.json({ isValid, message });
                    }
                    updateCount = await site.account.changeUserPassword(user.email, oldPassword, newPassword);
                    if (1 === updateCount) {
                        isValid = true;
                        return res.json({ isValid, information: 'Password updated' });
                    }
                }
                return res.json({ isValid, message: 'Failed to update password' });
            } catch (err) {
                return res.json({ isValid, message: err.message });
            }
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
