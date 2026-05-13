const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/email');

const TOKEN_EXPIRY = '30d';
const OTP_EXPIRY_MINUTES = 5;

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (id, role) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

/**
 * Validates email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates password strength
 */
const isValidPassword = (password) => {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

exports.register = async (req, res) => {
    try {
        console.log('[REGISTER] Registration request received:', { email: req.body.email, name: req.body.name });

        const { name, email, password } = req.body;

        // Input validation
        if (!name || !email || !password) {
            console.log('[REGISTER] Missing required fields');
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        // Email format validation
        if (!isValidEmail(email)) {
            console.log('[REGISTER] Invalid email format:', email);
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Password strength validation
        if (!isValidPassword(password)) {
            console.log('[REGISTER] Weak password for email:', email);
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.log('[REGISTER] User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user - password will be auto-hashed by pre-save hook
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password, // Will be hashed by the pre-save middleware
            role: 'user',
            isVerified: false
        });

        console.log('[REGISTER] User created with hashed password:', user.id);


        // Generate OTP
        const otp = generateOTP();
        await OTP.create({ email: user.email, otp, action: 'account_verification' });

        // Send OTP email
        console.log('[REGISTER] OTP generated:', otp);
        const emailResult = await sendOTPEmail(user.email, otp, 'account_verification');

        if (!emailResult.success) {
            console.error('[REGISTER] Email sending failed:', emailResult.error);
            return res.status(500).json({
                message: 'User created but OTP email failed. Please contact support.',
                email: user.email
            });
        }

        res.status(201).json({
            message: 'OTP sent to email. Please verify.',
            email: user.email
        });
    } catch (error) {
        console.error('[REGISTER ERROR]', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        console.log('[LOGIN] Login attempt:', { email: req.body.email });

        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            console.log('[LOGIN] Missing credentials');
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log('[LOGIN] User not found:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare password using model method
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            console.log('[LOGIN] Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('[LOGIN] User authenticated:', { id: user._id, isVerified: user.isVerified, role: user.role });

        // Check if account is verified (admins are exempt)
        if (!user.isVerified && user.role !== 'admin') {
            console.log('[LOGIN] Account not verified, sending OTP:', email);

            // Generate new OTP
            const otp = generateOTP();
            await OTP.findOneAndDelete({ email: user.email, action: 'account_verification' });
            await OTP.create({ email: user.email, otp, action: 'account_verification' });

            // Send OTP email
            const emailResult = await sendOTPEmail(user.email, otp, 'account_verification');

            if (!emailResult.success) {
                console.error('[LOGIN] Failed to send verification OTP:', emailResult.error);
                return res.status(500).json({
                    message: 'Failed to send verification email. Please try again.',
                    needsVerification: true,
                    email: user.email
                });
            }

            return res.status(403).json({
                message: 'Account not verified',
                needsVerification: true,
                email: user.email
            });
        }

        // Generate JWT token
        const token = generateToken(user.id, user.role);

        console.log('[LOGIN] Login successful:', { id: user._id, tokenPrefix: token.substring(0, 20) + '...' });

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            token
        });
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        console.log('[VERIFY OTP] OTP verification request:', { email: req.body.email });

        const { email, otp } = req.body;

        // Input validation
        if (!email || !otp) {
            console.log('[VERIFY OTP] Missing email or OTP');
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        // Find valid OTP
        const validOTP = await OTP.findOne({ email: email.toLowerCase(), otp, action: 'account_verification' });

        if (!validOTP) {
            console.log('[VERIFY OTP] Invalid or expired OTP for:', email);
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        console.log('[VERIFY OTP] OTP verified for:', email);

        // Update user verification status
        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { isVerified: true },
            { new: true }
        ).select('-password');

        if (!user) {
            console.log('[VERIFY OTP] User not found after OTP verification:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete used OTP
        await OTP.deleteOne({ _id: validOTP._id });

        console.log('[VERIFY OTP] Account verified successfully:', { id: user._id, email: user.email });

        res.status(200).json({
            message: 'Account verified successfully',
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        console.error('[VERIFY OTP ERROR]', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
