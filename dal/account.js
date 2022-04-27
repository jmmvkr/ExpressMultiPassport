const DbAccess = require('./db-access.js');
const TimeUtil = require('../util/time-util.js');


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
     * Create an initialized Account instance.
     * @returns {Account} - initialized Account instance.
     */
    static makeOne() {
        return new Account();
    }

}

module.exports = Account;
