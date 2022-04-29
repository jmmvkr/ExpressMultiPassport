/**
 * Place holder class in order to have a link to {@link global|global types}.
 * 
 * @see global
 */
class Global { }


/**
 * A message object is assumed to be a normal Object or an Error, with string property named 'message'
 * @typedef {Object|Error} MessageObject
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
