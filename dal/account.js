const crypto = require('crypto');

const DbAccess = require('./db-access.js');
const TimeUtil = require('../util/time-util.js');

// constants for hash function
const SCRYPT_SALT_LENGTH = 64;
const SCRYPT_KEY_LENGTH = 128;
const SCRYPT_OPTIONS = { N: 1024 };


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
     * Sign up a user that sign in by password
     * 
     * @param {string} email - Email address of user
     * @param {string} password - Password given from user
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
     * Make a hash record from given rawString, with a random-generated salt.
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
     * Create an initialized Account instance.
     * @returns {Account} - initialized Account instance.
     */
    static makeOne() {
        return new Account();
    }

}

module.exports = Account;
