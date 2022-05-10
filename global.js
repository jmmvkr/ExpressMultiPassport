/**
 * Place holder class in order to have a link to {@link global|global types}.
 * 
 * @see global
 */
class Global { }


/**
 * A message object is assumed to be a normal Object or an Error, with string property named 'message'
 * @typedef {Object|Error|InvalidNote} MessageObject
 * @property {string} message - Message stored in the message object
 */

/**
* Indicates that a parameter accepts all types of input value
* @typedef {Object|string|number|boolean} AnyType
*/

/**
 * A router type of an Express.js site.
 * @see {@link https://expressjs.com/en/guide/routing.html|Express.js Router}
 * @typedef {express.Router} Router
 */

/**
 * An HTTP request in Express.js
 * @see {@link https://expressjs.com/en/4x/api.html#req|Express.js Request}
 * @typedef {Object} Request
 */

/**
 * An HTTP response in Express.js
 * @see {@link https://expressjs.com/en/4x/api.html#res|Express.js Response}
 * @typedef {Object} Response
 */

/**
 * Callback of next Express.js middleware.
 * @callback NextCallback
 */

/**
 * User statistics information for management purpose.
 * @typedef {Object} UserStatistics
 * @property {number} totalCount - Number of signed up users.
 * @property {number} todayActive - Number of active users today.
 * @property {number} weeklyAverage - Average number of active users this week.
 */

/**
 * Result of a database INSERT / UPDATE command.
 * @typedef {Object} UpdateResult
 * @property {number} count - Number of records updated in a database operation.
 */

/**
 * Result of a complex input check operation.
 * @typedef {Object} InputCheck
 * @property {string} input - Original input string to be checked.
 * @property {boolean} isValid - The input string is valid or not.
 * @property {InvalidNote[]} invalidNotes - The causes of why an input check operation fails.
 */

/**
 * An cause of why input check operation fails.
 * @typedef {Object} InvalidNote
 * @property {number} note - Numeric note for why input check operation fails.
 * @property {string} [message] - Optional human-friendly message for why input check operation fails.
 */

/**
 * Email options to be used with EmailSender (send email by SendGrid)
 * @typedef {Object} EmailOptions
 * @property {string} apiKey - The API key from SendGrid.
 * @property {string} senderEmail - The sender email registered in SendGrid.
 * @property {string} [verifyUrl] - The verify URL of site when <strong>EmailSender.sendVerificationEmail()</strong> is used
 * 
 * @see util#EmailSender
 */

/**
 * A structured email message object, that can be send to SendGrid.
 * @typedef {Object} EmailMessage
 * @property {string} from - The sender of an email.
 * @property {string} to - The reciever of an email.
 * @property {string} subject - The subject of an email.
 * @property {string} text - The text content of an email.
 * @property {string} html - The HTML content of an email.
 * 
 * @see util#EmailSender
 */

/**
 * A namespace for routes.
 * @namespace routes
 */

/**
* A namespace for DAL (Data Access Level) classes.
* @namespace dal
*/

/**
 * A namespace for utility classes.
 * @namespace util
 */


/**
 * An ExpireError indicates that an operation failed to meet given deadline. As a result, operation failed.
 */
class ExpireError extends Error {

    /**
     * Create an ExpireError with given information.
     * 
     * @param {string} message The message describing why an operation fails.
     * @param {Date} now - The start time of an operation.
     * @param {Date} deadline - The deadline that an operation failed to meet.
     */
    constructor(message, now, deadline) {
        super(message);

        /** The start time of an operation. */
        this.now = now;

        /** The deadline that an operation failed to meet. */
        this.deadline = deadline;
    }

}

export { ExpireError };
