const DbAccess = require('./db-access.js');


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
     * Create an initialized Account instance.
     * @returns {Account} - initialized Account instance.
     */
    static makeOne() {
        return new Account();
    }

}

module.exports = Account;
