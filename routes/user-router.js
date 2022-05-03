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
        /**
         * @swagger
         * paths:
         *   /user/dashboard:
         *     get:
         *       summary: Show dashboard
         *       tags:
         *         - "user"
         *       responses:
         *         200:
         *           description: Show dashboard when signed in
         *         302:
         *           description: Redirect to /signin when user not yet signed in
         */
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
        /**
         * @swagger
         * paths:
         *   /user/profile:
         *     get:
         *       summary: Show user profile
         *       tags:
         *         - "user"
         *       responses:
         *         200:
         *           description: Show user profile when signed in
         *         302:
         *           description: Redirect to /signin when user not yet signed in
         */
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
        /**
         * @swagger
         * paths:
         *   /user/profile:
         *     post:
         *       summary: Handle nickname change in user profile
         *       tags:
         *         - "user"
         *       requestBody:
         *         content:
         *           application/x-www-form-urlencoded:
         *             schema:
         *               type: object
         *               properties:
         *                 email:
         *                   type: string
         *                   description: Email address of a user
         *                 nickname:
         *                   type: string
         *                   description: New nickname of a user
         *               required:
         *                - email
         *                - nickname
         *       responses:
         *         200:
         *           description: Always redirect to user profile (GET method) to show the updated nickname
         *         302:
         *           description: Redirect to /signin when user not yet signed in
         */
         router.post('/profile', site.securePage, async function (req, res, next) {
            const email = req.body.email;
            const nickname = req.body.nickname;
            if (email && nickname) {
                await account.changeUserNickname(email, nickname);
            }
            return res.redirect(req.originalUrl);
        });

        // serve user list
        /**
         * @swagger
         * paths:
         *   /user/list:
         *     get:
         *       summary: Show list of users, in JSON format
         *       tags:
         *         - "user"
         *       responses:
         *         200:
         *           description: Show list of users
         */
        router.get('/list', site.secureApi, async function (req, res, next) {
            const userList = await account.getUserList();
            res.json(userList);
        });

        // serve user statistics
        /**
         * @swagger
         * paths:
         *   /user/statistics:
         *     get:
         *       summary: Show user statistics, in JSON format
         *       tags:
         *         - "user"
         *       responses:
         *         200:
         *           description: Show user statistics
         */
         router.get('/statistics', site.secureApi, async function (req, res, next) {
            const userStatistics = await account.getUserStatistics();
            res.json(userStatistics);
        });

        // serve reset password
        /**
         * paths:
         * @swagger
         *   /user/reset-password:
         *     post:
         *       summary: Handle reset password
         *       tags:
         *         - "user"
         *       requestBody:
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 userId:
         *                   type: number
         *                   description: unique database id of a user
         *                 oldPassword:
         *                   type: string
         *                   description: Old password of a user
         *                 password:
         *                   type: string
         *                   description: New password of a user
         *               required:
         *                - email
         *                - nickname
         *       responses:
         *         200:
         *           description: Show result of this reset password operation
         *         401:
         *           description: Show Unauthorized if user not yet signed in
         */
        router.post('/reset-password', async function (req, res, next) {
            try {
                const userId = parseInt(req.body.userId);
                const oldPassword = (req.body.oldPassword);
                const newPassword = (req.body.password);
                var message = 'Not signed in';
                var isValid = false;

                if (!req.isAuthenticated()) {
                    return res.status(401).json({ isValid, message });
                }
                if (!userId) {
                    return res.status(401).json({ isValid, message });
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
