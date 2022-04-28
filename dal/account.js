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
        var prisma = this.getDbClient();
        var data = await prisma.account.findMany({
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
        var totalCount = await this.countTotalSignedUp();
        var todayActive = await this.countTodayActive();
        var weeklyAverage = await this.countWeeklyAverage();

        // adjust precision for user friendly
        var floatBase = 0.01;
        weeklyAverage = Math.ceil(weeklyAverage / floatBase) * floatBase;

        var allStatistics = {
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
        var prisma = this.getDbClient();
        var userList = await prisma.account.findMany({
            where: {
                email: email
            }
        })
        return userList;
    }

    /**
     * Count number of signed up users.
     * @returns {number} - number of signed up users.
     */
    async countTotalSignedUp() {
        var prisma = this.getDbClient();
        var totalCount = await prisma.account.count();
        return totalCount;
    }

    /**
     * Count number of active users today.
     * @returns {number} - number of active users today.
     */
    async countTodayActive() {
        var prisma = this.getDbClient();
        var now = await DbAccess.getDbNow(prisma);
        var today = TimeUtil.getDayStart(now);

        var todayCount = await prisma.account.count({
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
        var prisma = this.getDbClient();
        var timeEnd = await DbAccess.getDbNow(prisma);
        var timeStart = TimeUtil.addDays(timeEnd, -7);

        var weekCount = await prisma.account.count({
            where: {
                session: {
                    gte: timeStart,
                    lte: timeEnd
                }
            }
        });
        var weekAverage = (weekCount / 7);
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
        var oldUserList = await this.findUsersByEmail(email);
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
     */
    async emailSignUp(email, password, nickname) {
        var verified = false;
        var prisma = this.getDbClient();
        var oldUserList = await this.findUsersByEmail(email);
        if (DbAccess.hasData(oldUserList)) {
            throw new Error('E-mail was already used');
        }
        var hash = null;
        if (password) {
            hash = Account.makeHash(password);
        } else {
            hash = 'x';
        }
        var now = await DbAccess.getDbNow(prisma);
        var data = {
            nickname,
            email,
            password: hash,
            created: now,
            login_count: 0,
            session_count: 0,
            session: null,
            verified
        };
        var result = await prisma.account.createMany({ data });
        return DbAccess.getUpdateCount(result);
    }

    /**
     * Update login count & session time. Do not add login count when it's a restored login (true === isRestored).
     * @param {string} email - Email address of a user.
     * @param {boolean} isRestored - This session update is a login restored by cookie or not.
     * @returns {boolean} - always true
     */
    async updateSession(email, isRestored) {
        var oldUserList = await this.findUsersByEmail(email);
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
