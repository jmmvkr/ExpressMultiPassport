const DbAccess = require('./db-access.js');


/**
 * Account manager that access database by prisma.
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

}

module.exports = Account;
