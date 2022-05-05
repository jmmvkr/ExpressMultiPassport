const sgMail = require('@sendgrid/mail');

/**
 * Utility class to send E-mail to end user by SendGrid.
 * 
 * @memberof util#
 * 
 * @tutorial [Usage]
 * <pre>
 * <code class='prettyprint'>
 * const EmailSender = require('./util/email-sender.js');
 * 
 * // config for EmailSender
 * const config = {
 *     mailOptions: {
 *         apiKey: process.env.SENDGRID_API_KEY,
 *         senderEmail: process.env.SENDGRID_SENDER,
 *         verifyUrl: process.env.SERVICE_BASE + '/user/verify'
 *     }
 * };
 * 
 * // initialize EmailSender
 * EmailSender.initialize(config.mailOptions);
 * 
 * // send verification email 
 * EmailSender.sendVerificationEmail('test@example.com', 'token1234');
 * 
 * </code>
 * </pre> 
 * 
 * @hideconstructor
 * @see #.initialize
 * @see #.sendVerificationEmail
 */
class EmailSender {

    static status = { senderEmail: 'test@example.com', verifyUrl: 'https://example.com/verify' };

    /**
     * Initialize EmailSender with given mail options. If given mail options do NOT match 
     * options in your SendGrid account, end user will not recieve any email.
     * 
     * @param {Object} mailOptions - Email options for your SendGrid account.
     */
    static initialize(mailOptions) {
        var status = EmailSender.status;
        status.apiKey = mailOptions.apiKey;
        status.senderEmail = mailOptions.senderEmail;
        status.verifyUrl = mailOptions.verifyUrl;
        sgMail.setApiKey(status.apiKey);
    }

    /**
     * Send an email by providing a structured message for SendGrid.
     * @param {EmailMessage} msg - Structured message for SendGrid to send an email.
     */
    static sendMail(msg) {
        const onEmailSent = function () { };
        const onEmailError = function (err) {
            console.error(err);
        };
        sgMail.send(msg)
            .then(onEmailSent)
            .catch(onEmailError);
    }

    /**
     * Send a the verification email to the given email address.
     * 
     * @param {string} email - Email address that will recieve the verification email.
     * @param {string} verifyCode - The verification code or token.
     */
    static sendVerificationEmail(email, verifyCode) {
        const verifyBase = EmailSender.status.verifyUrl;
        const verifyLink = `${verifyBase}/${email}/${verifyCode}`;
        const htmlContent = `Click <a href="${verifyLink}">HERE</a> to verify your E-mail.`;
        const msg = {
            to: email,
            from: EmailSender.status.senderEmail,
            subject: 'Verification Email',
            text: 'Verification Email',
            html: htmlContent
        }
        EmailSender.sendMail(msg);
    }

}


module.exports = EmailSender;
