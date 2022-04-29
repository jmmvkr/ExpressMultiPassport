const crypto = require('crypto');

const DbAccess = require('./db-access.js');
const TimeUtil = require('../util/time-util.js');

// constants for hash function
const SCRYPT_SALT_LENGTH = 64;
const SCRYPT_KEY_LENGTH = 128;
const SCRYPT_OPTIONS = { N: 1024 };
const SCRYPT_SALT_IN_STRING = (2 * SCRYPT_KEY_LENGTH);

// constants session update
const UPDATE_SESSION_ONLY = 'UPDATE account SET session_count = 1 + session_count, session = NOW() where email = $1;';
const UPDATE_SESSION_LOGIN = 'UPDATE account SET session_count = 1 + session_count, session = NOW(), login_count = 1 + login_count where email = $1;';


/**
 * Account manager that access database by prisma.
 * @memberof dal#
 */
class Account extends DbAccess {

    /**
     * Get a list containing information of all registered users, <strong>without password</strong>.
     * @returns {Object[]} - a list containing user information.
     */
    async getUserList() {
        const prisma = this.getDbClient();
        const data = await prisma.account.findMany({
            orderBy: {
                id: 'asc'
            }
        });

        // remove secret values for security
        data.forEach(function (row) {
            delete row.password;
        });
        return data;
    }

    /**
     * Get user statistics information at this moment.
     * @returns {UserStatistics} - user statistics information.
     * @see UserStatistics
     * @see #countTotalSignedUp
     * @see #countTodayActive
     * @see #countWeeklyAverage
     */
    async getUserStatistics() {
        const totalCount = await this.countTotalSignedUp();
        const todayActive = await this.countTodayActive();
        const weeklyAverage = await this.countWeeklyAverage();

        const allStatistics = {
            totalCount,
            todayActive,
            weeklyAverage
        }
        return allStatistics;
    }

    /**
     * Find a list of users that have given email address.
     * @param {string} email - Email address of user to be searched
     * @returns {Object[]} - a list of users that have given email address.
     */
    async findUsersByEmail(email) {
        const prisma = this.getDbClient();
        const userList = await prisma.account.findMany({
            where: {
                email: email
            }
        })
        return userList;
    }

    /**
     * Find user by id in database.
     * @param {number} id - id of user record in database.
     * @returns {Object} - a user that have given email address.
     */
    async findUserById(id) {
        const prisma = this.getDbClient();
        const user = await prisma.account.findFirst({
            where: {
                id
            }
        });
        return user;
    }

    /**
     * Change password of a user.
     * @param {string} email - Email address of user
     * @param {string} oldPassword - Old password of user in plain-text form.
     * @param {string} newPassword - New password of user in plain-text form.
     * @returns {number} - number of record updated by this operation (0 if failed, and 1 if succeed).
     * 
     * @throws {Error} When New Password is the same as Old Password
     * @throws {Error} When Old Password not match
     */
    async changeUserPassword(email, oldPassword, newPassword) {
        var id = 0;
        var oldHash = '';
        var row;

        if (oldPassword === newPassword) {
            throw new Error('New Password is the same as Old Password');
        }

        const oldUserList = await this.findUsersByEmail(email);
        var isOldHashValid = false;
        if (DbAccess.hasData(oldUserList)) {
            if (1 === oldUserList.length) {
                row = oldUserList[0];
                id = row.id;
                email = row.email;
                oldHash = row.password;

                isOldHashValid = Account.checkHash(oldPassword, oldHash);
            }
        }
        if (!isOldHashValid) {
            throw new Error('Old Password not match');
        }

        var prisma;
        var result = null;
        var newHash = Account.makeHash(newPassword);
        if (id && email) {
            prisma = this.getDbClient();
            result = await prisma.account.updateMany({
                where: {
                    id,
                    email
                },
                data: {
                    password: newHash
                }
            });
        }

        return DbAccess.getUpdateCount(result);
    }

    /**
     * Change nickname of a user.
     * @param {string} email - Email address of user.
     * @param {string} nickname - New nickname of user.
     * @returns {number} - number of record updated by this operation (0 if failed, and 1 if succeed).
     */
    async changeUserNickname(email, nickname) {
        var prisma;
        var result = null;
        if (email && nickname) {
            prisma = this.getDbClient();
            result = await prisma.account.updateMany({
                where: {
                    email
                },
                data: {
                    nickname
                }
            });
        }
        return DbAccess.getUpdateCount(result);
    }

    /**
     * Count number of signed up users.
     * @returns {number} - number of signed up users.
     */
    async countTotalSignedUp() {
        const prisma = this.getDbClient();
        const totalCount = await prisma.account.count();
        return totalCount;
    }

    /**
     * Count number of active users today.
     * @returns {number} - number of active users today.
     */
    async countTodayActive() {
        const prisma = this.getDbClient();
        const now = await DbAccess.getDbNow(prisma);
        const today = TimeUtil.getDayStart(now);

        const todayCount = await prisma.account.count({
            where: {
                session: {
                    gte: today,
                    lte: now
                }
            }
        });
        return todayCount;
    }

    /**
     * Calculate average number of active users this week.
     * @returns {number} - average number of active users this week.
     */
    async countWeeklyAverage() {
        const prisma = this.getDbClient();
        const timeEnd = await DbAccess.getDbNow(prisma);
        const timeStart = TimeUtil.addDays(timeEnd, -7);

        const weekCount = await prisma.account.count({
            where: {
                session: {
                    gte: timeStart,
                    lte: timeEnd
                }
            }
        });
        const weekAverage = (weekCount / 7);
        return weekAverage;
    }

    /**
     * Sign in a user by email & password
     * 
     * @param {string} email - Email address of user 
     * @param {string} password - Password from user
     * @returns {boolean} - true if sign in succeed
     */
    async emailSignIn(email, password) {
        const oldUserList = await this.findUsersByEmail(email);
        var row;
        var isValidHash;
        if (1 === oldUserList.length) {
            row = oldUserList[0];
            isValidHash = Account.checkHash(password, row.password);
            return isValidHash;
        }
        return false;
    }

    /**
     * Sign up a user that sign in by email & password
     * 
     * @param {string} email - Email address of user
     * @param {string} password - Password from user
     * @param {string} nickname - Initial nickname extracted from email
     * @returns {number} - number of record inserted by this sign up operation (normally 0 if failed, and 1 if succeed)
     * 
     * @throws {Error} When given E-mail was already used in previous sign-up
     */
    async emailSignUp(email, password, nickname) {
        const verified = false;
        const prisma = this.getDbClient();
        const oldUserList = await this.findUsersByEmail(email);
        if (DbAccess.hasData(oldUserList)) {
            throw new Error('E-mail was already used');
        }
        var hash = null;
        if (password) {
            hash = Account.makeHash(password);
        } else {
            hash = 'x';
        }
        const now = await DbAccess.getDbNow(prisma);
        const data = {
            nickname,
            email,
            password: hash,
            created: now,
            login_count: 0,
            session_count: 0,
            session: null,
            verified
        };
        const result = await prisma.account.createMany({ data });
        return DbAccess.getUpdateCount(result);
    }

    /**
     * Update login count & session time. Do not add login count when it's a restored login (true === isRestored).
     * @param {string} email - Email address of a user.
     * @param {boolean} isRestored - This session update is a login restored by cookie or not.
     * @returns {boolean} - always true
     */
    async updateSession(email, isRestored) {
        const oldUserList = await this.findUsersByEmail(email);
        var prisma;
        if (1 === oldUserList.length) {
            prisma = this.getDbClient();
            if (isRestored) {
                await prisma.$queryRawUnsafe(UPDATE_SESSION_ONLY, email);
            } else {
                await prisma.$queryRawUnsafe(UPDATE_SESSION_LOGIN, email);
            }
        }
        return true;
    }

    /**
     * Make a hash record from given rawString (often password), with a random-generated salt.
     * Generated hash record was defined by 
     * <pre>
     * <strong>hashRecord := hashFunction(rawString)|salt</strong>
     * </pre>
     * in hex format. In current implementation, <strong>scrypt</strong> was chosen as the <strong>hashFunction</strong>.
     * 
     * @param {string} rawString - Given raw string to generate a hash record.
     * @returns {string} - a generated hash record.
     */
    static makeHash(rawString) {
        const salt = crypto.randomBytes(SCRYPT_SALT_LENGTH);
        const cypher = crypto.scryptSync(rawString, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS);
        const full = cypher.toString('hex') + salt.toString('hex');
        return full;
    }

    /**
     * Check hash record calculated from rawString (often password) and previous random salt match the hash record.
     * @param {string} rawString - Given raw string to be checked with hash record.
     * @param {string} fullRecord - Full hash record stored in database.
     * @returns {boolean} - true if given raw string matches hash record. 
     */
    static checkHash(rawString, fullRecord) {
        const hexSalt = fullRecord.substring(SCRYPT_SALT_IN_STRING);
        const salt = Buffer.from(hexSalt, 'hex');
        const cypher = crypto.scryptSync(rawString, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS);
        const hexCypher = cypher.toString('hex');
        if ((hexSalt.length + hexCypher.length) === fullRecord.length) {
            if (fullRecord.startsWith(hexCypher) && fullRecord.endsWith(hexSalt)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Create an initialized Account instance.
     * @returns {Account} - initialized Account instance.
     */
    static makeOne() {
        return new Account();
    }

}

module.exports = Account;
