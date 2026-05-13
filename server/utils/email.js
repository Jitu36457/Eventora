const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ETHEREAL_USER = process.env.ETHEREAL_USER;
const ETHEREAL_PASS = process.env.ETHEREAL_PASS;

// Determine if we should use Ethereal (test mode)
const USE_ETHEREAL = ETHEREAL_USER && ETHEREAL_PASS && process.env.NODE_ENV !== 'production';

// Validate email configuration
if (!USE_ETHEREAL && (!EMAIL_USER || !EMAIL_PASS)) {
    console.error('[EMAIL CONFIG ERROR] EMAIL_USER and EMAIL_PASS must be set in .env file');
    console.error('[EMAIL CONFIG ERROR] For Gmail, use an App Password (not your regular password)');
    console.error('[EMAIL CONFIG ERROR] See: https://myaccount.google.com/apppasswords');
    console.error('[EMAIL CONFIG ERROR] Or set ETHEREAL_USER/PASS for test email');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Email configuration is required in production');
    }
}

let transporter;

if (USE_ETHEREAL) {
    console.log('[EMAIL CONFIG] Using Ethereal test email service');
    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: ETHEREAL_USER,
            pass: ETHEREAL_PASS
        },
        logger: false,
        debug: false
    });
} else {
    console.log('[EMAIL CONFIG] Using Gmail SMTP service');
    console.log('[EMAIL CONFIG] Email user:', EMAIL_USER);

    // Validate Gmail address format
    if (!EMAIL_USER || !EMAIL_USER.toLowerCase().endsWith('@gmail.com')) {
        console.error('[EMAIL CONFIG WARNING] EMAIL_USER should be a @gmail.com address for proper SMTP authentication');
    }

    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: true
        }
    });
}

// Verify transporter connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('[EMAIL VERIFY ERROR] Nodemailer connection failed:', error.message);
        console.error('[EMAIL VERIFY ERROR] Common issues:');
        console.error('  1. Gmail requires an App Password (not regular password)');
        console.error('  2. 2-Factor Authentication must be enabled on Google account');
        console.error('  3. Go to: https://myaccount.google.com/apppasswords');
        console.error('  4. Generate an App Password and use it as EMAIL_PASS');
        console.error('  5. Or use Ethereal test email by adding ETHEREAL_USER/PASS to .env');
        if (process.env.NODE_ENV === 'production') {
            console.error('[EMAIL VERIFY ERROR] CRITICAL: Email is required in production!');
        }
    } else {
        console.log('[EMAIL VERIFY SUCCESS] Nodemailer is ready to send emails');
    }
});

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    try {
        console.log(`[EMAIL] Attempting to send booking email to: ${userEmail}`);

        const mailOptions = {
            from: `"Eventora" <${EMAIL_USER || ETHEREAL_USER}>`,
            to: userEmail,
            subject: `Booking Confirmed: ${eventTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #2c3e50;">Hi ${userName}!</h2>
                    <p style="color: #34495e; font-size: 16px;">Your booking for the event <strong style="color: #e74c3c;">${eventTitle}</strong> is successfully confirmed.</p>
                    <p style="color: #7f8c8d;">Thank you for choosing Eventora.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ecf0f1;">
                    <p style="color: #95a5a6; font-size: 12px;">© 2026 Eventora. All rights reserved.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS] Booking email sent to ${userEmail}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[EMAIL ERROR] Failed to send booking email:', {
            to: userEmail,
            error: error.message,
            code: error.code,
            response: error.response
        });
        return { success: false, error: error.message };
    }
};

const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        console.log(`[EMAIL] Attempting to send OTP email to: ${userEmail} for type: ${type}`);

        const title = type === 'account_verification' ? 'Verify your Eventora Account' : 'Eventora Booking Verification';
        const msg = type === 'account_verification'
            ? 'Please use the following OTP to verify your new Eventora account.'
            : 'Please use the following OTP to verify and confirm your event booking.';

        const mailOptions = {
            from: `"Eventora" <${EMAIL_USER || ETHEREAL_USER}>`,
            to: userEmail,
            subject: title,
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; max-width: 500px; margin: 0 auto;">
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #2c3e50; margin-bottom: 20px;">${title}</h2>
                        <p style="color: #555; font-size: 16px; line-height: 1.6;">${msg}</p>
                        <div style="margin: 30px auto; padding: 20px; font-size: 32px; font-weight: bold; background: #ffffff; border: 2px dashed #3498db; width: fit-content; letter-spacing: 8px; color: #2c3e50; border-radius: 5px;">
                            ${otp}
                        </div>
                        <p style="color: #999; font-size: 12px; margin-top: 20px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
                    </div>
                    <p style="color: #bdc3c7; font-size: 11px; margin-top: 20px;">© 2026 Eventora. All rights reserved.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS] OTP sent to ${userEmail}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[EMAIL ERROR] Failed to send OTP email:', {
            to: userEmail,
            type,
            error: error.message,
            code: error.code,
            response: error.response
        });
        return { success: false, error: error.message };
    }
};

module.exports = { sendBookingEmail, sendOTPEmail };