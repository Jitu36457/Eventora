const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    if (token && token.startsWith('Bearer ')) {
        try {
            token = token.split(' ')[1];

            if (!process.env.JWT_SECRET) {
                throw new Error('JWT_SECRET is not configured');
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired, please login again' });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Invalid token, please login again' });
            }
            console.error('[AUTH MIDDLEWARE ERROR]', error);
            return res.status(401).json({ message: 'Not authorized, token verification failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, token format invalid (use: Bearer <token>)' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
