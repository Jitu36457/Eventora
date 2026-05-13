const nodemailer = require('nodemailer');

async function createEtherealAccount() {
    console.log('Creating Ethereal test email account...\n');

    try {
        // Create a test account
        const testAccount = await nodemailer.createTestAccount();

        console.log('✓ Ethereal account created successfully!\n');
        console.log('Add these credentials to your server/.env file:\n');
        console.log('ETHEREAL_USER=' + testAccount.user);
        console.log('ETHEREAL_PASS=' + testAccount.pass);
        console.log('\nYou can also use these to view sent messages:');
        console.log('https://ethereal.email/inbox/' + testAccount.user.split('@')[0]);

        // Test the connection
        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });

        await transporter.verify();
        console.log('✓ Transporter verified!\n');

        // Send a test email
        const info = await transporter.sendMail({
            from: testAccount.user,
            to: testAccount.user,
            subject: 'Eventora Test Email',
            text: 'Welcome to Eventora! Your email configuration is working.',
            html: '<h1>Success!</h1><p>Your Eventora email configuration is working correctly.</p>'
        });

        console.log('✓ Test email sent!\n');
        console.log('View the email at: https://ethereal.email/message/' + info.messageId.split('<')[1].split('>')[0]);

    } catch (error) {
        console.error('Error creating Ethereal account:', error);
    }
}

createEtherealAccount();
