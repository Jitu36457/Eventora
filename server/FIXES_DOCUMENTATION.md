# Eventora Backend - Authentication & Email Fixes

## Summary of Issues Fixed

### 1. ⚠️ bcrypt Password Hashing Issue
**Problem:** Password was being double-hashed with separate `genSalt` and `hash` calls, which can cause verification issues.

**Fix:** Implemented a pre-save hook in the User model that automatically hashes passwords before saving, along with a `matchPassword` instance method for clean password comparison.

### 2. 📧 Gmail SMTP Authentication Failure (535-5.7.8)
**Problem:** The `EMAIL_PASS` in `.env` was set to `nhxgusoksyoszxob` which is NOT a valid Gmail App Password. Gmail requires a special 16-character App Password when 2FA is enabled.

**Fix:** 
- Updated email configuration to enforce proper Gmail setup
- Added clear error messages guiding users to generate App Passwords
- Enhanced error handling to detect authentication failures

### 3. 🔒 Missing JWT Secret Validation
**Problem:** No validation that `JWT_SECRET` is set, which could cause token generation to fail silently.

**Fix:** Added validation in token generation and auth middleware with clear error messages.

### 4. 📧 Transporter Configuration Issues
**Problem:** Email transporter was created without proper TLS settings and verification errors were ignored.

**Fix:**
- Added `requireTLS: true` and proper TLS configuration for Gmail
- Enhanced error logging for email failures
- Added connection verification with detailed error messages

### 5. 🌍 Email Validation
**Problem:** No validation for email format or case sensitivity issues.

**Fix:** Added email validation and automatic lowercase conversion in auth controller.

### 6. 🔐 Password Strength Validation
**Problem:** No password strength requirements during registration.

**Fix:** Added password validation requiring 8+ characters with uppercase, lowercase, and numbers.

### 7. 🔍 Auth Middleware Improvements
**Problem:** Generic error messages didn't distinguish between expired tokens, invalid tokens, and missing tokens.

**Fix:** Added specific error handling for different JWT error types.

## Files Modified

1. **server/models/User.js** - Added pre-save hook and `matchPassword` method
2. **server/controllers/authController.js** - Fixed bcrypt usage, added validations
3. **server/utils/email.js** - Fixed Gmail SMTP config, added Ethereal fallback
4. **server/middleware/auth.js** - Enhanced JWT error handling
5. **server/.env** - Updated with proper configuration instructions
6. **server/.env.example** - Added comprehensive configuration template
7. **server/test-email.js** - Enhanced test script with better error reporting

## Setup Instructions

### Step 1: Configure Gmail App Password (CRITICAL)

**You MUST use a Gmail App Password, NOT your regular Gmail password!**

1. Enable 2-Factor Authentication on your Google account:
   - Go to: https://myaccount.google.com/signinoptions/two-step-verification
   - Follow the prompts to enable 2FA

2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Click "Generate"
   - Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

3. Update `.env` file:
```env
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # 16-char app password (no spaces in .env)
```

### Step 2: Set JWT Secret

Generate a strong secret key (32+ characters):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env`:
```env
JWT_SECRET=your-generated-secret-key-here
```

### Step 3: Test Email Configuration

```bash
cd server
npm run test-email
```

Expected output:
```
✓ Transporter verified successfully!
✓ Test email sent successfully!
```

### Step 4: Start the Server

```bash
npm run dev
```

## Alternative: Use Ethereal Test Email

For development without Gmail, use the included Ethereal setup:

```bash
cd server
node setup-test-email.js
```

Copy the generated credentials to your `.env`:
```env
ETHEREAL_USER=test-email@ethereal.email
ETHEREAL_PASS=testpassword
```

Emails will be sent to the test inbox and viewable at ethereal.email.

## API Endpoints

### Register User
```
POST /api/auth/register
Body: { name, email, password }
```
- Creates user with hashed password
- Sends verification OTP to email
- Password must meet strength requirements

### Login
```
POST /api/auth/login
Body: { email, password }
```
- Validates credentials
- Sends OTP if account not verified
- Returns JWT token for verified users

### Verify OTP
```
POST /api/auth/verify-otp
Body: { email, otp }
```
- Verifies account
- Returns JWT token

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Troubleshooting

### Error: "535-5.7.8 Username and Password not accepted"

**Cause:** Incorrect EMAIL_PASS (not a valid App Password)

**Solution:**
1. Ensure 2FA is enabled on Google account
2. Generate a new App Password at https://myaccount.google.com/apppasswords
3. Use the 16-character code (remove spaces) in EMAIL_PASS
4. Wait 5-10 minutes after enabling 2FA before trying again

### Error: "Less secure app access is not allowed"

**Solution:** App Passwords are required. Regular passwords no longer work with Gmail SMTP.

### Error: "Token expired"

**Solution:** Tokens expire after 30 days. User must login again to get a new token.

### Error: "Invalid token"

**Solution:** Token may be malformed or tampered with. Verify JWT_SECRET matches across server restarts.

## Security Best Practices

1. ✅ Never commit `.env` file to version control
2. ✅ Use strong JWT secrets (32+ chars)
3. ✅ Always use App Passwords for Gmail
4. ✅ Enable 2FA on Google accounts
5. ✅ Passwords are hashed with bcrypt (salt rounds: 10)
6. ✅ Tokens expire after 30 days
7. ✅ OTPs expire after 5 minutes

## Dependencies

- bcryptjs ^2.4.3
- jsonwebtoken ^9.0.2
- nodemailer ^6.9.11
- mongoose ^8.2.0
- dotenv ^16.4.5
