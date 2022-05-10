/**
 * Enum of authorization provider support.
 * @enum {AuthorizationProvider}
 */
const AuthorizationProvider = {

    /** Numeric code to specify unknown authorization provider */
    AUTH_UNKNOWN: 0, 

    /** Numeric code to specify password sign in */
    AUTH_PASSWORD: 1, 

    /** Numeric code to specify google-oauth2 sign in */
    AUTH_GOOGLE_OAUTH2: 2, 

    /** Numeric code to specify facebook sign in */
    AUTH_FACEBOOK: 3
};


/**
 * Helper class for Account to parse given authorization provider into numeric code.
 * @hideconstructor
 * @see dal#Account
 * @see AuthorizationProvider
 */
class AuthorizationParser {
    
    /**
     * Parse given authorization provider in string format into numeric code.
     * @param {string} authProvider - Given authorization provider in string format.
     * @returns {number} numeric constant code of supported authorization provider.
     * @throws {Error} Error when given authProvider is not supported.
     */
    static parse(authProvider) {
        if('password' === authProvider) {
            return AuthorizationProvider.AUTH_PASSWORD;
        }
        if('google-oauth2' === authProvider) {
            return AuthorizationProvider.AUTH_GOOGLE_OAUTH2;
        }
        if('facebook' === authProvider) {
            return AuthorizationProvider.AUTH_FACEBOOK;
        }
        throw new Error('Unsupported authProvider: ' + authProvider);
    }

}

export { AuthorizationProvider };
export { AuthorizationParser };
