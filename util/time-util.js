const TIME_ONE_SECOND = 1000;
const TIME_ONE_MINUTE = 60 * TIME_ONE_SECOND;
const TIME_ONE_HOUR = 60 * TIME_ONE_MINUTE;
const TIME_ONE_DAY = 24 * TIME_ONE_HOUR;


/**
 * Utility for date-time calculations.
 * 
 * @memberof util#
 */
class TimeUtil {

    /**
     * Add given number of days to given date.
     * 
     * @param {Date} date - The base date for calculation.
     * @param {number} daysToAdd - Number of days to be added to given date.
     * @return {Date} - date after given number of days was added
     */
    static addDays(date, daysToAdd) {
        return new Date(date.getTime() + (daysToAdd * TIME_ONE_DAY));
    }

    /**
    * Add given number of hours to given date.
    * 
    * @param {Date} date - The base date for calculation.
    * @param {number} hoursToAdd - Number of hours to be added to given date.
    * @return {Date} - date after given number of hours was added
    */
    static addHours(date, hoursToAdd) {
        return new Date(date.getTime() + (hoursToAdd * TIME_ONE_HOUR));
    }

    /**
     * Add given number of minutes to given date.
     * 
     * @param {Date} date - The base date for calculation.
     * @param {number} minutesToAdd - Number of minutes to be added to given date.
     * @return {Date} - date after given number of minutes was added
     */
    static addMinutes(date, minutesToAdd) {
        return new Date(date.getTime() + (minutesToAdd * TIME_ONE_MINUTE));
    }

    /**
     * Get midnight time (AM 00:00) of local time zone.
     * 
     * @param {Date} date - The base date for calculation.
     * @return {Date} - The date representing midnight time in the same day as given date.
     */
    static getDayStart(date) {
        return new Date(date.getFullYear() + '-' + (1 + date.getMonth()) + '-' + date.getDate());
    }

}


export { TimeUtil };
