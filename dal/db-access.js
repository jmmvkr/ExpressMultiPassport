const client_1 = require('@prisma/client');


/**
 * Base class of all DAL (Data Access Level) classes. Common 
 * database access function can be placed here.
 * 
 * @memberof dal#
 * @hideconstructor
 */
class DbAccess {

    /**
     * Create a database client instance.
     * @protected
     * @returns {PrismaClient} - created database client instance.
     */
    static createDbClient() {
        var instance = new client_1.PrismaClient();
        return instance;
    }

    /**
     * Get a database client instance for most case. Can work with 
     * database manager / software architecture to enhance performance.
     * @protected
     * @returns {PrismaClient} - created or shared database client instance.
     */
    getDbClient() {
        var prisma = global.prisma;
        return prisma;
    }

    /**
     * Get timestamp of now on database side.
     * @param {PrismaClient} prisma - database client instance.
     * @returns {Date} - timestamp of now on database side.
     */
    static async getDbNow(prisma) {
        var dataNow = await prisma.$queryRaw`SELECT NOW() as now;`;
        var now;
        if (dataNow && dataNow.length > 0) {
            now = new Date(dataNow[0].now);
        } else {
            throw new Error('failed to get NOW() from database');
        }
        return now;
    }

    /**
     * Determine data rows from a SELECT query has data or not.
     * @param {Object[]} dataRows - The database result of a SELECT query
     * @returns {boolean} true - if dataRows has data (length >= 1)
     */
    static hasData(dataRows) {
        var dataType;
        if (dataRows) {
            dataType = dataRows.constructor;
            if (Array !== dataType) {
                throw new Error(`Array expected (current: ${dataType}), missing await before calling findMany() ?`);
            }
            if (dataRows.length > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get update count of a database INSERT / UPDATE command.
     * @param {*} result - The database result of a INSERT / UPDATE query 
     * @returns {number} - number of updated data rows.
     */
    static getUpdateCount(result) {
        if (result) {
            return result.count || 0;
        }
        return 0;
    }

}


const global = {
    prisma: DbAccess.createDbClient()
};


module.exports = DbAccess;
