const RX_LOWER = /[a-z]/;
const RX_UPPER = /[A-Z]/;
const RX_DIGIT = /[0-9]/;
const RX_SPECIAL = /[\/!"#$%&'()*+,-.:;<=>?@[\]^_`{|}~]/;

/**
 * Defines validation violation notes (numeric) identifying difference cases of password check fails
 * 
 * @enum {InvalidPassword}
 */
const InvalidPassword = {

    /** @description Missing lower alphabet in password */
    PASSWORD_NO_LOWER_CHAR: 1,

    /** @description Missing upper alphabet in password */
    PASSWORD_NO_UPPER_CHAR: 2,

    /** @description Missing digit in password */
    PASSWORD_NO_DIGIT_CHAR: 3,

    /** @description Missing symbol in password */
    PASSWORD_NO_SYMBOL_CHAR: 4,

    /** @description Password is too short */
    PASSWORD_TOO_SHORT: 5,

    /** @description Passwords (first, and confirmed) provided are different */
    PASSWORD_CONFIRM_NOT_SAME: 6,
};

/**
 * Password Checker in order to check password part of user register inputs.
 * 
 * @memberof util#
 * @see #checkPassword
 * @tutorial [Usage]
 * <pre>
 * <code class='prettyprint'>
 * const options = { enableSampleMessage: true };
 * const passwordChecker = new PasswordChecker(options);
 * 
 * console.log('----\r\n', passwordChecker.checkPassword('aW5+tes'));
 * console.log('----\r\n', passwordChecker.checkPassword('aW5+test'));
 * console.log('----\r\n', passwordChecker.checkPassword('aW6+test', 'aW7+test'));
 * console.log('----\r\n', passwordChecker.checkPassword('aW7+test', 'aW7+test'));
 * </code>
 * </pre> 
 */
class PasswordChecker {

    /**
     * Create a PasswordChecker instance with given options.
     * 
     * @param {Object} options - Options to be applied to created instance
     */
    constructor(options) {
        const instanceOptions = options || {};

        /** 
         * @member {number} - Minimum accepted password length
         * @default 8
         */
        this.strongLength = instanceOptions.strongLength || 8;

        /** 
         * @member {boolean} - When set to true, generates sample (human-frendly) message when checkPassword() failed 
         * @default false
         */
        this.enableSampleMessage = (true === instanceOptions.enableSampleMessage);
    }

    /**
     * Check given password input has a lower case character
     * @param {string} passwordInput - The password input
     * @return {boolean} - True if passwordInput has a lower case character
     */
    hasLowerCharacter(passwordInput) {
        return RX_LOWER.test(passwordInput);
    }

    /**
     * Check given password input has a upper case character
     * @param {string} passwordInput - The password input
     * @return {boolean} - True if passwordInput has a upper case character
     */
    hasUpperCharacter(passwordInput) {
        return RX_UPPER.test(passwordInput);
    }

    /**
     * Check given password input has a digit character
     * @param {string} passwordInput - The password input
     * @return {boolean} - True if passwordInput has a digit character
     */
    hasDigitCharacter(passwordInput) {
        return RX_DIGIT.test(passwordInput);
    }

    /**
     * Check given password input has a special character
     * @param {string} passwordInput - The password input
     * @return {boolean} - True if passwordInput has a special character
     */
    hasSpecialCharacter(passwordInput) {
        return RX_SPECIAL.test(passwordInput);
    }

    /**
     * Check given password input has strong length
     * @param {string} passwordInput - The password input
     * @return {boolean} - True if passwordInput has strong length
     * @see #strongLength
     */
    hasStrongLength(passwordInput) {
        return (passwordInput.length >= this.strongLength);
    }

    /**
     * Check given password input is a valid password or not.
     * @param {string} passwordInput - The password input
     * @param {string} [passwordConfirm] - The password confirm input
     * @return {InputCheck} - An InputCheck instance, describing the result of input checking
     */
    checkPassword(passwordInput, passwordConfirm) {
        var invalidNotes = [];
        this.collectInvalidNotes(invalidNotes, this.hasLowerCharacter(passwordInput), InvalidPassword.PASSWORD_NO_LOWER_CHAR);
        this.collectInvalidNotes(invalidNotes, this.hasUpperCharacter(passwordInput), InvalidPassword.PASSWORD_NO_UPPER_CHAR);
        this.collectInvalidNotes(invalidNotes, this.hasDigitCharacter(passwordInput), InvalidPassword.PASSWORD_NO_DIGIT_CHAR);
        this.collectInvalidNotes(invalidNotes, this.hasSpecialCharacter(passwordInput), InvalidPassword.PASSWORD_NO_SYMBOL_CHAR);
        this.collectInvalidNotes(invalidNotes, this.hasStrongLength(passwordInput), InvalidPassword.PASSWORD_TOO_SHORT);

        var samePassword;
        if ((passwordConfirm) && (0 === invalidNotes.length)) {
            samePassword = (passwordConfirm === passwordInput);
            this.collectInvalidNotes(invalidNotes, samePassword, InvalidPassword.PASSWORD_CONFIRM_NOT_SAME);
        }

        const isValid = (0 === invalidNotes.length);
        const result = {
            input: passwordInput,
            isValid,
            invalidNotes
        }
        return result;
    }

    /** 
     * Collect validation violation note if input is invalid
     * @private
     * @param {InvalidNote[]} invalidNotes - Array to collect invalid input note
     * @param {boolean} isValid - Validation check passed from caller
     * @param {number} noteIn - The validation violation note (numeric) passed from caller
     */
    collectInvalidNotes(invalidNotes, isValid, noteIn) {
        var messageIn = '';
        if (!isValid) {
            if (this.enableSampleMessage) {
                messageIn = this.getSampleMessage(noteIn);
                invalidNotes.push({
                    note: noteIn,
                    message: messageIn,
                });
            } else {
                invalidNotes.push({
                    note: noteIn
                });
            }
        }
    }

    /** 
     * Generates sample messages for internal debug
     * @private
     * @param {number} invalidNote - The validation violation note (numeric) to generate message
     */
    getSampleMessage(invalidNote) {
        switch (invalidNote) {
            case InvalidPassword.PASSWORD_NO_LOWER_CHAR:
                return 'Password must contain at least one lower character';
            case InvalidPassword.PASSWORD_NO_UPPER_CHAR:
                return 'Password must contain at least one upper character';
            case InvalidPassword.PASSWORD_NO_DIGIT_CHAR:
                return 'Password must contain at least one digit character';
            case InvalidPassword.PASSWORD_NO_SYMBOL_CHAR:
                return 'Password must contain at least one special character';
            case InvalidPassword.PASSWORD_TOO_SHORT:
                return 'Password must contain at least ' + this.strongLength + ' characters';
            case InvalidPassword.PASSWORD_CONFIRM_NOT_SAME:
                return 'Password confirm must be same as the first password input';
        }
        return 'unknown password error';
    }

    static runSample() {
        const options = { enableSampleMessage: true };
        const passwordChecker = new PasswordChecker(options);

        console.log('----\r\n', passwordChecker.checkPassword(''));
        console.log('----\r\n', passwordChecker.checkPassword('a'));
        console.log('----\r\n', passwordChecker.checkPassword('aW'));
        console.log('----\r\n', passwordChecker.checkPassword('+-345678'));
        console.log('----\r\n', passwordChecker.checkPassword('aW5+'));
        console.log('----\r\n', passwordChecker.checkPassword('aW5+tes'));
        console.log('----\r\n', passwordChecker.checkPassword('aW5+test'));
        console.log('----\r\n', passwordChecker.checkPassword('aW6+test', 'aW7+test'));
        console.log('----\r\n', passwordChecker.checkPassword('aW7+test', 'aW7+test'));
        console.log(passwordChecker.getSampleMessage(InvalidPassword.PASSWORD_NO_LOWER_CHAR));
        console.log(passwordChecker.getSampleMessage(InvalidPassword.PASSWORD_NO_UPPER_CHAR));
        console.log(passwordChecker.getSampleMessage(InvalidPassword.PASSWORD_NO_DIGIT_CHAR));
        console.log(passwordChecker.getSampleMessage(InvalidPassword.PASSWORD_NO_SYMBOL_CHAR));
        console.log(passwordChecker.getSampleMessage(InvalidPassword.PASSWORD_TOO_SHORT));
        console.log(passwordChecker.getSampleMessage(InvalidPassword.PASSWORD_CONFIRM_NOT_SAME));
    }


} // end - class

export { PasswordChecker };
