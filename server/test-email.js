const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
    console.log('='.repeat(60));
    console.log('Testing Email Configuration');
    console.log('='.repeat(60));
    console.log('\nEnvironment Variables:');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '[SET - ' + process.env.EMAIL_PASS.length + ' chars]' : 'NOT SET');
    console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('  ETHEREAL_USER:', process.env.ETHEREAL_USER || 'NOT SET');

    // Check if Gmail config is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('\n[GMAIL CONFIG] Missing EMAIL_USER or EMAIL_PASS');
        console.log('  Using Ethereal test email instead...');
    }

    let transporter;

    // Use Ethereal if Gmail config missing (for testing)
    if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
        console.log('\n[TRANSPORTER] Using Ethereal test service');
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ETHEREAL_USER,
                pass: process.env.ETHEREAL_PASS
            }
        });
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log('\n[TRANSPORTER] Using Gmail SMTP');
        console.log('  Account:', process.env.EMAIL_USER);

        if (!process.env.EMAIL_USER.toLowerCase().endsWith('@gmail.com')) {
            console.log('  WARNING: EMAIL_USER is not a @gmail.com address!');
        }

        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: true
            }
        });
    } else {
        console.log('\n[ERROR] No email configuration found!');
        console.log('  Either set EMAIL_USER/EMAIL_PASS for Gmail');
        console.log('  Or set ETHEREAL_USER/ETHEREAL_PASS for test email');
        return;
    }

    console.log('\nVerifying transporter...');

    try {
        const verified = await transporter.verify();
        console.log('✓ Transporter verified successfully!');
        console.log('\nSending test OTP email...');

        const info = await transporter.sendMail({
            from: `"Eventora Test" <${process.env.EMAIL_USER || process.env.ETHEREAL_USER}>`,
            to: process.env.EMAIL_USER || process.env.ETHEREAL_USER,
            subject: 'Eventora - Test OTP Email',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Test OTP for Eventora</h2>
                    <p>Your verification code is:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px; padding: 20px; background: #f8f9fa; border: 2px dashed #3498db;">123456</div>
                    <p>This code expires in 5 minutes.</p>
                </div>
            `
        });

        console.log('✓ Test email sent successfully!');
        console.log('  Message ID:', info.messageId);
        console.log('  Response:', info.response);

        if (process.env.ETHEREAL_USER) {
            const etherealUrl = `https://ethereal.email/message/${info.messageId.split('<')[1].split('>')[0]}`;
            console.log('\nView email at:', etherealUrl);
        }

    } catch (error) {
        console.log('\n✗ Email test failed!');
        console.log('  Error:', error.message);
        if (error.code) console.log('  Code:', error.code);
        if (error.response) console.log('  Response:', error.response);

        if (error.response && error.response.includes('535')) {
            console.log('\n[GMAIL AUTH ERROR]');
            console.log('  This is likely because:');
            console.log('  1. EMAIL_PASS is not a valid Gmail App Password');
            console.log('  2. 2-Factor Authentication is not enabled on your Google account');
            console.log('  3. The App Password was generated incorrectly');
            console.log('\n  To fix:');
            console.log('  1. Enable 2FA: https://myaccount.google.com/signinoptions/two-step-verification');
            console.log('  2. Generate App Password: https://myaccount.google.com/apppasswords');
            console.log('  3. Use the 16-char App Password as EMAIL_PASS');
        }
    }
}

testEmail();
